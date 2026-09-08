import React, { useState, useEffect } from 'react';
import { Order, Shipment, ShipmentStatus } from '../types';
import { shipmentService } from '../lib/shipmentService';
import { carrierRegistry } from '../lib/carrierIntegration';
import { X, Plus, CheckCircle2, AlertCircle } from 'lucide-react';

interface ShipmentManagementProps {
  order: Order;
  onClose?: () => void;
  onShipmentCreated?: (shipment: Shipment) => void;
}

export const ShipmentManagement: React.FC<ShipmentManagementProps> = ({
  order,
  onClose,
  onShipmentCreated,
}) => {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);

  // Form state
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('demo');
  const [shippingMethod, setShippingMethod] = useState('express');
  const [originLocation, setOriginLocation] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');

  // Status update form state
  const [newStatus, setNewStatus] = useState('IN_TRANSIT');
  const [newLocation, setNewLocation] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (order.shipmentId || order.id) {
      loadShipment();
    }
  }, [order.shipmentId]);

  const loadShipment = async () => {
    setIsLoading(true);
    try {
      const result = order.shipmentId
        ? await shipmentService.getShipmentById(order.shipmentId)
        : await shipmentService.getShipmentByOrderId(order.id);
      if (result) {
        setShipment(result);
        setError(null);
      }
    } catch (err) {
      setError('Failed to load shipment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      setError('Tracking number is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newShipment = await shipmentService.createShipment(
        order.id,
        trackingNumber,
        carrier,
        shippingMethod
      );

      if (newShipment) {
        // Persist the initial route details for the customer tracking view.
        if (originLocation || destinationLocation || estimatedDelivery) {
          await shipmentService.updateShipmentDetails(
            newShipment.id,
            {
              originLocation: originLocation || undefined,
              destinationLocation: destinationLocation || undefined,
              estimatedDeliveryDate: estimatedDelivery ? new Date(estimatedDelivery).toISOString() : undefined,
            }
          );
        }

        // Reload shipment with updated data
        const updated = await shipmentService.getShipmentById(newShipment.id);
        if (updated) {
          setShipment(updated);
          onShipmentCreated?.(updated);
        }
      }

      setShowCreateForm(false);
      setTrackingNumber('');
      setCarrier('demo');
      setShippingMethod('express');
      setOriginLocation('');
      setDestinationLocation('');
      setEstimatedDelivery('');
    } catch (err) {
      setError('Failed to create shipment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTrackingEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipment) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const trackingEvent = await shipmentService.addTrackingEvent(
        shipment.id,
        newStatus as ShipmentStatus,
        newLocation || undefined,
        newDescription,
        {}
      );
      if (!trackingEvent) {
        setError('Could not save the tracking update. Please try again.');
        return;
      }
      if (newLocation || estimatedDelivery) {
        await shipmentService.updateShipmentDetails(shipment.id, {
          currentLocation: newLocation || undefined,
          estimatedDeliveryDate: new Date(estimatedDelivery).toISOString(),
        });
      }

      // Reload shipment
      await loadShipment();
      setShowStatusUpdate(false);
      setNewStatus('IN_TRANSIT');
      setNewLocation('');
      setNewDescription('');
    } catch (err) {
      setError('Failed to add tracking event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateShipmentStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipment) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await shipmentService.updateShipmentStatus(
        shipment.id,
        newStatus as ShipmentStatus,
        newLocation || undefined,
        estimatedDelivery ? new Date(estimatedDelivery).toISOString() : undefined
      );

      // Reload shipment
      await loadShipment();
      setShowStatusUpdate(false);
    } catch (err) {
      setError('Failed to update shipment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!shipment) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await shipmentService.markAsDelivered(shipment.id);
      await loadShipment();
    } catch (err) {
      setError('Failed to mark as delivered');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableCarriers = carrierRegistry.getAllCarriers();
  const shippingMethods = ['standard', 'express', 'priority'];
  const statuses = [
    'ORDER_PLACED',
    'PAYMENT_CONFIRMED',
    'PROCESSING',
    'PACKED',
    'SHIPPED',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'DELIVERY_ATTEMPTED',
    'DELAYED',
    'CANCELLED',
    'RETURNED',
    'REFUNDED',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#EAE5DF] border border-[#DCD7D0] p-4 rounded">
        <div>
          <h3 className="text-[#2A2A2A] font-bold uppercase tracking-wider text-sm">Shipment Management</h3>
          <p className="text-[#6B655E] text-xs">Order: {order.id}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[#6B655E] hover:text-[#2A2A2A] transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded text-red-700 text-xs">
          <AlertCircle size={16} className="inline mr-2" />
          {error}
        </div>
      )}

      {/* Existing Shipment Display */}
      {shipment && (
        <div className="bg-[#F5F2ED] border border-[#DCD7D0] p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[#6B655E] uppercase tracking-wider font-bold text-[9px] block mb-1">
                Tracking Number
              </span>
              <span className="text-[#2A2A2A] font-mono break-all">{shipment.trackingNumber}</span>
            </div>
            <div>
              <span className="text-[#6B655E] uppercase tracking-wider font-bold text-[9px] block mb-1">
                Carrier
              </span>
              <span className="text-[#2A2A2A] capitalize">{shipment.carrier}</span>
            </div>
            <div>
              <span className="text-[#6B655E] uppercase tracking-wider font-bold text-[9px] block mb-1">
                Status
              </span>
              <span className="text-[#2A2A2A] font-semibold">{shipment.shipmentStatus}</span>
            </div>
            <div>
              <span className="text-[#6B655E] uppercase tracking-wider font-bold text-[9px] block mb-1">
                Est. Delivery
              </span>
              <span className="text-[#2A2A2A]">
                {shipment.estimatedDeliveryDate
                  ? new Date(shipment.estimatedDeliveryDate).toLocaleDateString('en-IN')
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowStatusUpdate(!showStatusUpdate)}
              className="text-xs px-3 py-2 bg-[#A68A64] text-white hover:bg-[#8B6F47] rounded transition-colors"
            >
              Add Tracking Event
            </button>
            {shipment.shipmentStatus !== 'DELIVERED' && (
              <button
                onClick={handleMarkDelivered}
                disabled={isSubmitting}
                className="text-xs px-3 py-2 bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 rounded transition-colors"
              >
                <CheckCircle2 size={14} className="inline mr-1" />
                Mark Delivered
              </button>
            )}
          </div>

          {/* Events List */}
          {shipment.trackingEvents && shipment.trackingEvents.length > 0 && (
            <div className="border-t border-[#DCD7D0] pt-3">
              <p className="text-[#6B655E] uppercase tracking-wider font-bold text-[9px] mb-2">Events</p>
              <div className="space-y-2">
                {shipment.trackingEvents.slice(0, 3).map((event) => (
                  <div key={event.id} className="text-[10px] text-[#6B655E]">
                    <p className="font-semibold text-[#2A2A2A]">{event.status}</p>
                    {event.description && <p>{event.description}</p>}
                    <p className="text-[#9B8F78]">{new Date(event.timestamp).toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Shipment Form */}
      {!shipment && !showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full text-sm px-4 py-3 bg-[#A68A64] text-white hover:bg-[#8B6F47] rounded font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Create Shipment
        </button>
      )}

      {/* Create Shipment Form Content */}
      {showCreateForm && (
        <form onSubmit={handleCreateShipment} className="bg-[#F5F2ED] border border-[#DCD7D0] p-4 space-y-4">
          <h4 className="text-[#2A2A2A] font-bold text-sm uppercase tracking-wider">New Shipment</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-[#6B655E] uppercase tracking-wider font-bold text-[9px] mb-1">
                Tracking Number *
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g., DEMO123456789"
                className="w-full px-3 py-2 border border-[#DCD7D0] rounded text-[#2A2A2A] text-sm focus:outline-none focus:border-[#A68A64]"
                required
              />
            </div>

            <div>
              <label className="block text-[#6B655E] uppercase tracking-wider font-bold text-[9px] mb-1">
                Carrier
              </label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full px-3 py-2 border border-[#DCD7D0] rounded text-[#2A2A2A] text-sm focus:outline-none focus:border-[#A68A64]"
              >
                {availableCarriers.map((c) => (
                  <option key={c} value={c}>
                    {c.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#6B655E] uppercase tracking-wider font-bold text-[9px] mb-1">
                Shipping Method
              </label>
              <select
                value={shippingMethod}
                onChange={(e) => setShippingMethod(e.target.value)}
                className="w-full px-3 py-2 border border-[#DCD7D0] rounded text-[#2A2A2A] text-sm focus:outline-none focus:border-[#A68A64]"
              >
                {shippingMethods.map((m) => (
                  <option key={m} value={m}>
                    {m.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#6B655E] uppercase tracking-wider font-bold text-[9px] mb-1">
                Origin Location
              </label>
              <input
                type="text"
                value={originLocation}
                onChange={(e) => setOriginLocation(e.target.value)}
                placeholder="e.g., Bengaluru, Karnataka"
                className="w-full px-3 py-2 border border-[#DCD7D0] rounded text-[#2A2A2A] text-sm focus:outline-none focus:border-[#A68A64]"
              />
            </div>

            <div>
              <label className="block text-[#6B655E] uppercase tracking-wider font-bold text-[9px] mb-1">
                Destination Location
              </label>
              <input
                type="text"
                value={destinationLocation}
                onChange={(e) => setDestinationLocation(e.target.value)}
                placeholder="e.g., Mumbai, Maharashtra"
                className="w-full px-3 py-2 border border-[#DCD7D0] rounded text-[#2A2A2A] text-sm focus:outline-none focus:border-[#A68A64]"
              />
            </div>

            <div>
              <label className="block text-[#6B655E] uppercase tracking-wider font-bold text-[9px] mb-1">
                Estimated Delivery Date
              </label>
              <input
                type="date"
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
                className="w-full px-3 py-2 border border-[#DCD7D0] rounded text-[#2A2A2A] text-sm focus:outline-none focus:border-[#A68A64]"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-[#A68A64] text-white hover:bg-[#8B6F47] disabled:bg-gray-400 rounded font-semibold text-sm transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Shipment'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="flex-1 px-4 py-2 border border-[#DCD7D0] text-[#2A2A2A] hover:bg-[#EAE5DF] rounded font-semibold text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Add Tracking Event Form */}
      {shipment && showStatusUpdate && (
        <form onSubmit={handleAddTrackingEvent} className="bg-[#F5F2ED] border border-[#DCD7D0] p-4 space-y-4">
          <h4 className="text-[#2A2A2A] font-bold text-sm uppercase tracking-wider">Add Tracking Event</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-[#6B655E] uppercase tracking-wider font-bold text-[9px] mb-1">
                Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-[#DCD7D0] rounded text-[#2A2A2A] text-sm focus:outline-none focus:border-[#A68A64]"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#6B655E] uppercase tracking-wider font-bold text-[9px] mb-1">
                Location
              </label>
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="e.g., Delhi, India"
                className="w-full px-3 py-2 border border-[#DCD7D0] rounded text-[#2A2A2A] text-sm focus:outline-none focus:border-[#A68A64]"
              />
            </div>

            <div>
              <label className="block text-[#6B655E] uppercase tracking-wider font-bold text-[9px] mb-1">
                Description
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="e.g., Package in transit to destination"
                rows={2}
                className="w-full px-3 py-2 border border-[#DCD7D0] rounded text-[#2A2A2A] text-sm focus:outline-none focus:border-[#A68A64]"
              />
            </div>

            <div>
              <label className="block text-[#6B655E] uppercase tracking-wider font-bold text-[9px] mb-1">
                Estimated Delivery Date
              </label>
              <input
                type="date"
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
                className="w-full px-3 py-2 border border-[#DCD7D0] rounded text-[#2A2A2A] text-sm focus:outline-none focus:border-[#A68A64]"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-[#A68A64] text-white hover:bg-[#8B6F47] disabled:bg-gray-400 rounded font-semibold text-sm transition-colors"
            >
              {isSubmitting ? 'Adding...' : 'Add Event'}
            </button>
            <button
              type="button"
              onClick={() => setShowStatusUpdate(false)}
              className="flex-1 px-4 py-2 border border-[#DCD7D0] text-[#2A2A2A] hover:bg-[#EAE5DF] rounded font-semibold text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
