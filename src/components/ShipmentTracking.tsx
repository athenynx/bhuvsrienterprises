import React, { useEffect, useState } from 'react';
import { Shipment, TrackingEvent } from '../types';
import { shipmentService } from '../lib/shipmentService';
import { Package, Truck, MapPin, Calendar, CheckCircle2, Clock, AlertCircle, ExternalLink } from 'lucide-react';

interface ShipmentTrackingProps {
  shipmentId?: string;
  orderId?: string;
  orderNumber?: string;
  trackingNumber?: string;
}

const statusIconMap: Record<string, React.ReactNode> = {
  'ORDER_PLACED': <Package size={16} />,
  'PAYMENT_CONFIRMED': <CheckCircle2 size={16} />,
  'PROCESSING': <Clock size={16} />,
  'PACKED': <Package size={16} />,
  'SHIPPED': <Truck size={16} />,
  'IN_TRANSIT': <Truck size={16} />,
  'OUT_FOR_DELIVERY': <Truck size={16} />,
  'DELIVERED': <CheckCircle2 size={16} />,
  'DELIVERY_ATTEMPTED': <AlertCircle size={16} />,
  'DELAYED': <AlertCircle size={16} />,
  'CANCELLED': <AlertCircle size={16} />,
  'RETURNED': <AlertCircle size={16} />,
  'REFUNDED': <AlertCircle size={16} />,
};

const statusLabelMap: Record<string, string> = {
  'ORDER_PLACED': 'Order Placed',
  'PAYMENT_CONFIRMED': 'Payment Confirmed',
  'PROCESSING': 'Processing',
  'PACKED': 'Packed',
  'SHIPPED': 'Shipped',
  'IN_TRANSIT': 'In Transit',
  'OUT_FOR_DELIVERY': 'Out for Delivery',
  'DELIVERED': 'Delivered',
  'DELIVERY_ATTEMPTED': 'Delivery Attempted',
  'DELAYED': 'Delayed',
  'CANCELLED': 'Cancelled',
  'RETURNED': 'Returned',
  'REFUNDED': 'Refunded',
};

export const ShipmentTracking: React.FC<ShipmentTrackingProps> = ({
  shipmentId,
  orderId,
  orderNumber,
  trackingNumber,
}) => {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShipment = async () => {
      setIsLoading(true);
      setError(null);
      setShipment(null);
      let result: Shipment | null = null;

      try {
        if (shipmentId) {
          result = await shipmentService.getShipmentById(shipmentId);
        } else if (orderId) {
          result = await shipmentService.getShipmentByOrderId(orderId);
        } else if (orderNumber || trackingNumber) {
          if (orderNumber) result = await shipmentService.getShipmentByOrderNumber(orderNumber);
          if (!result && trackingNumber) result = await shipmentService.getShipmentByTrackingNumber(trackingNumber);
        }

        if (!result) setError('Shipment information not found');
        else setShipment(result);
      } catch (err) {
        setError('Failed to load shipment information');
      } finally {
        setIsLoading(false);
      }
    };

    if (shipmentId || orderId || orderNumber || trackingNumber) fetchShipment();
  }, [shipmentId, orderId, orderNumber, trackingNumber]);

  if (isLoading) {
    return (
      <div className="bg-[#EAE5DF] border border-[#DCD7D0] p-6 rounded text-center">
        <p className="text-[#6B655E] text-sm">Loading shipment information...</p>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="bg-[#EAE5DF] border border-[#DCD7D0] p-6 rounded">
        <p className="text-[#A68A64] text-sm font-semibold mb-2">No Tracking Available</p>
        <p className="text-[#6B655E] text-xs">{error || 'Shipment tracking information is not available yet.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Shipment Header */}
      <div className="bg-[#EAE5DF] border border-[#DCD7D0] p-4 space-y-3">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-xs">
          <div>
            <span className="text-[#6B655E] uppercase tracking-wider font-bold text-[10px] block mb-1">Tracking Number</span>
            <span className="text-[#2A2A2A] font-mono break-all">{shipment.trackingNumber}</span>
          </div>
          <div>
            <span className="text-[#6B655E] uppercase tracking-wider font-bold text-[10px] block mb-1">Carrier</span>
            <span className="text-[#2A2A2A] capitalize">{shipment.carrier}</span>
          </div>
          <div>
            <span className="text-[#6B655E] uppercase tracking-wider font-bold text-[10px] block mb-1">Status</span>
            <span className="text-[#2A2A2A] font-semibold">{statusLabelMap[shipment.shipmentStatus] || shipment.shipmentStatus}</span>
          </div>
          <div>
            <span className="text-[#6B655E] uppercase tracking-wider font-bold text-[10px] block mb-1">Est. Delivery</span>
            <span className="text-[#2A2A2A]">
              {shipment.estimatedDeliveryDate
                ? new Date(shipment.estimatedDeliveryDate).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                  })
                : 'N/A'}
            </span>
          </div>
        </div>

        {shipment.carrierTrackingUrl && (
          <a
            href={shipment.carrierTrackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#A68A64] hover:text-[#2A2A2A] text-xs font-semibold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
          >
            <ExternalLink size={12} />
            Track on Carrier Website
          </a>
        )}
      </div>

      {/* Location Info */}
      {(shipment.currentLocation || shipment.originLocation || shipment.destinationLocation) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {shipment.originLocation && (
            <div className="bg-[#F5F2ED] border border-[#DCD7D0] p-3">
              <span className="text-[#6B655E] uppercase tracking-wider font-bold text-[9px] block mb-1">Shipped From</span>
              <span className="text-[#2A2A2A] text-sm">{shipment.originLocation}</span>
            </div>
          )}
          {shipment.currentLocation && (
            <div className="bg-[#F5F2ED] border border-[#DCD7D0] p-3">
              <span className="text-[#6B655E] uppercase tracking-wider font-bold text-[9px] block mb-1">Current Location</span>
              <span className="text-[#2A2A2A] text-sm">{shipment.currentLocation}</span>
            </div>
          )}
          {shipment.destinationLocation && (
            <div className="bg-[#F5F2ED] border border-[#DCD7D0] p-3">
              <span className="text-[#6B655E] uppercase tracking-wider font-bold text-[9px] block mb-1">Delivering To</span>
              <span className="text-[#2A2A2A] text-sm">{shipment.destinationLocation}</span>
            </div>
          )}
        </div>
      )}

      {/* Tracking Timeline */}
      {shipment.trackingEvents && shipment.trackingEvents.length > 0 && (
        <div className="border border-[#DCD7D0]">
          <div className="bg-[#EAE5DF] p-3 border-b border-[#DCD7D0]">
            <h3 className="text-[#2A2A2A] font-bold text-xs uppercase tracking-wider">Tracking Timeline</h3>
          </div>
          <div className="p-0">
            {shipment.trackingEvents.map((event, index) => (
              <div
                key={event.id}
                className={`flex gap-4 p-4 ${index !== shipment.trackingEvents!.length - 1 ? 'border-b border-[#DCD7D0]' : ''}`}
              >
                <div className="shrink-0 mt-0.5">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#EAE5DF] border border-[#DCD7D0] text-[#2A2A2A]">
                    {statusIconMap[event.status] || <Package size={14} />}
                  </div>
                </div>
                <div className="grow min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[#2A2A2A] font-semibold text-xs">{statusLabelMap[event.status] || event.status}</p>
                      {event.location && (
                        <p className="text-[#6B655E] text-xs flex items-center gap-1 mt-1">
                          <MapPin size={12} />
                          {event.location}
                        </p>
                      )}
                      {event.description && (
                        <p className="text-[#6B655E] text-xs mt-1">{event.description}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[#6B655E] text-[10px] whitespace-nowrap">
                        {new Date(event.timestamp).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery Status */}
      {shipment.actualDeliveryDate && (
        <div className="bg-[#F5F2ED] border border-[#DCD7D0] p-4 text-center">
          <CheckCircle2 size={24} className="text-[#2A2A2A] mx-auto mb-2" />
          <p className="text-[#2A2A2A] font-semibold text-sm">Delivered</p>
          <p className="text-[#6B655E] text-xs">
            {new Date(shipment.actualDeliveryDate).toLocaleDateString('en-IN', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      )}
    </div>
  );
};
