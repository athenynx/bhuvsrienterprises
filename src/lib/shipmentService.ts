import { supabase } from './supabase';
import { Shipment, TrackingEvent, ShipmentStatus } from '../types';

/**
 * Send shipment email notifications
 */
const sendShipmentEmail = async (event: string, to: string, subject: string, text: string) => {
  try {
    await supabase.functions.invoke('send-business-email', {
      body: { event, to, subject, text },
    });
  } catch (error) {
    // Silently fail - don't block shipment operations
  }
};

/**
 * Shipment Service - Handles shipment creation, tracking, and status updates
 */

export const shipmentService = {
  /**
   * Create a new shipment for an order
   */
  async createShipment(
    orderId: string,
    trackingNumber: string,
    carrier: string,
    shippingMethod: string = 'standard'
  ): Promise<Shipment | null> {
    try {
      // Generate shipment number
      const shipmentNumber = `SHIP-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const { data, error } = await supabase
        .from('shipments')
        .insert([
          {
            order_id: orderId,
            shipment_number: shipmentNumber,
            tracking_number: trackingNumber,
            carrier,
            shipping_method: shippingMethod,
            shipment_status: 'SHIPPED',
          },
        ])
        .select()
        .single();

      if (error) return null;

      // Add initial tracking event
      await this.addTrackingEvent(data.id, 'SHIPPED', undefined, 'Shipment created and handed over to carrier');

      // Update order with shipment reference
      await supabase
        .from('orders')
        .update({ shipment_id: data.id, tracking_number: trackingNumber, courier_partner: carrier })
        .eq('id', orderId);

      // Fetch order to get customer email and send notification
      const { data: order } = await supabase
        .from('orders')
        .select('customer_email, order_number')
        .eq('id', orderId)
        .single();

      if (order?.customer_email) {
        await sendShipmentEmail(
          'shipment_created',
          order.customer_email,
          `Your shipment is on the way - ${order.order_number}`,
          `Your order ${order.order_number} has been shipped! Tracking number: ${trackingNumber}. Carrier: ${carrier}. You can track your shipment at www.bhuvisrienterprises.com/track`
        );
      }

      return this.mapShipmentRow(data);
    } catch (error) {
      return null;
    }
  },

  /**
   * Get shipment by ID with tracking events
   */
  async getShipmentById(shipmentId: string): Promise<Shipment | null> {
    try {
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', shipmentId)
        .maybeSingle();

      if (shipmentError || !shipment) return null;

      const { data: events } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('timestamp', { ascending: false });

      return this.mapShipmentRow(shipment, events || []);
    } catch (error) {
      return null;
    }
  },

  /**
   * Get shipment by tracking number
   */
  async getShipmentByTrackingNumber(trackingNumber: string): Promise<Shipment | null> {
    try {
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .select('*')
        .eq('tracking_number', trackingNumber)
        .maybeSingle();

      if (shipmentError || !shipment) return null;

      const { data: events } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('shipment_id', shipment.id)
        .order('timestamp', { ascending: false });

      return this.mapShipmentRow(shipment, events || []);
    } catch (error) {
      return null;
    }
  },

  /**
   * Get shipment by order ID
   */
  async getShipmentByOrderId(orderId: string): Promise<Shipment | null> {
    try {
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

      if (shipmentError || !shipment) return null;

      const { data: events } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('shipment_id', shipment.id)
        .order('timestamp', { ascending: false });

      return this.mapShipmentRow(shipment, events || []);
    } catch (error) {
      return null;
    }
  },

  async getShipmentByOrderNumber(orderNumber: string): Promise<Shipment | null> {
    const { data: order, error } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (error || !order) return null;
    return this.getShipmentByOrderId(order.id);
  },

  /**
   * Add a tracking event to a shipment
   */
  async addTrackingEvent(
    shipmentId: string,
    status: ShipmentStatus,
    location?: string,
    description?: string,
    carrierRawData?: Record<string, any>
  ): Promise<TrackingEvent | null> {
    try {
      const { data, error } = await supabase
        .from('tracking_events')
        .insert([
          {
            shipment_id: shipmentId,
            status,
            location: location || null,
            description: description || '',
            carrier_raw_data: carrierRawData || null,
          },
        ])
        .select()
        .single();

      if (error) return null;

      // Update shipment status
      await supabase
        .from('shipments')
        .update({ shipment_status: status, updated_at: new Date().toISOString() })
        .eq('id', shipmentId);

      return this.mapTrackingEventRow(data);
    } catch (error) {
      return null;
    }
  },

  /**
   * Update shipment status and location
   */
  async updateShipmentStatus(
    shipmentId: string,
    status: ShipmentStatus,
    location?: string,
    estimatedDeliveryDate?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        shipment_status: status,
        updated_at: new Date().toISOString(),
      };

      if (location) {
        updateData.current_location = location;
      }

      if (estimatedDeliveryDate) {
        updateData.estimated_delivery_date = estimatedDeliveryDate;
      }

      const { error } = await supabase
        .from('shipments')
        .update(updateData)
        .eq('id', shipmentId);

      if (!error) {
        // Send email for major status changes
        if (['OUT_FOR_DELIVERY', 'DELIVERED'].includes(status)) {
          const { data: shipment } = await supabase
            .from('shipments')
            .select('order_id')
            .eq('id', shipmentId)
            .single();

          if (shipment) {
            const { data: order } = await supabase
              .from('orders')
              .select('customer_email, order_number')
              .eq('id', shipment.order_id)
              .single();

            if (order?.customer_email) {
              const statusText = status === 'OUT_FOR_DELIVERY' 
                ? 'Out for Delivery - Your order is on its way to you!'
                : 'Delivered - Your order has been delivered!';
              
              await sendShipmentEmail(
                `shipment_${status.toLowerCase()}`,
                order.customer_email,
                statusText,
                `Your order ${order.order_number} is now ${status.replace('_', ' ').toLowerCase()}. Track it at www.bhuvisrienterprises.com/track`
              );
            }
          }
        }
      }

      return !error;
    } catch (error) {
      return false;
    }
  },

  async updateShipmentDetails(
    shipmentId: string,
    details: {
      originLocation?: string;
      currentLocation?: string;
      destinationLocation?: string;
      estimatedDeliveryDate?: string;
    }
  ): Promise<boolean> {
    const updateData: Record<string, string> = {
      updated_at: new Date().toISOString(),
    };
    if (details.originLocation) updateData.origin_location = details.originLocation;
    if (details.currentLocation) updateData.current_location = details.currentLocation;
    if (details.destinationLocation) updateData.destination_location = details.destinationLocation;
    if (details.estimatedDeliveryDate) updateData.estimated_delivery_date = details.estimatedDeliveryDate;

    const { error } = await supabase.from('shipments').update(updateData).eq('id', shipmentId);
    return !error;
  },

  /**
   * Mark shipment as delivered
   */
  async markAsDelivered(shipmentId: string): Promise<boolean> {
    try {
      const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      const { error } = await supabase
        .from('shipments')
        .update({
          shipment_status: 'DELIVERED',
          actual_delivery_date: now,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shipmentId);

      if (!error) {
        await this.addTrackingEvent(shipmentId, 'DELIVERED', undefined, 'Package delivered successfully');
        
        // Send delivery confirmation email
        const { data: shipment } = await supabase
          .from('shipments')
          .select('order_id')
          .eq('id', shipmentId)
          .single();

        if (shipment) {
          const { data: order } = await supabase
            .from('orders')
            .select('customer_email, order_number')
            .eq('id', shipment.order_id)
            .single();

          if (order?.customer_email) {
            await sendShipmentEmail(
              'shipment_delivered',
              order.customer_email,
              `Delivery Confirmed - Order ${order.order_number}`,
              `Great news! Your order ${order.order_number} has been delivered. Thank you for shopping with BhuviSri Enterprises!`
            );
          }
        }
      }

      return !error;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get all tracking events for a shipment
   */
  async getTrackingEvents(shipmentId: string): Promise<TrackingEvent[]> {
    try {
      const { data, error } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('timestamp', { ascending: false });

      if (error || !data) return [];

      return data.map(event => this.mapTrackingEventRow(event));
    } catch (error) {
      return [];
    }
  },

  /**
   * Map Supabase shipment row to Shipment type
   */
  mapShipmentRow(row: any, events?: any[]): Shipment {
    return {
      id: row.id,
      orderId: row.order_id,
      shipmentNumber: row.shipment_number,
      trackingNumber: row.tracking_number,
      carrier: row.carrier,
      shippingMethod: row.shipping_method,
      shipmentStatus: row.shipment_status as ShipmentStatus,
      originLocation: row.origin_location,
      currentLocation: row.current_location,
      destinationLocation: row.destination_location,
      estimatedDeliveryDate: row.estimated_delivery_date,
      actualDeliveryDate: row.actual_delivery_date,
      carrierTrackingUrl: row.carrier_tracking_url,
      trackingEvents: events
        ? events.map((e) => this.mapTrackingEventRow(e))
        : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  /**
   * Map Supabase tracking event row to TrackingEvent type
   */
  mapTrackingEventRow(row: any): TrackingEvent {
    return {
      id: row.id,
      shipmentId: row.shipment_id,
      status: row.status as ShipmentStatus,
      location: row.location,
      description: row.description,
      timestamp: row.timestamp,
      carrierRawData: row.carrier_raw_data,
    };
  },
};
