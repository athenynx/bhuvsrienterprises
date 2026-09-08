import React, { useState } from 'react';
import { ArrowLeft, Search, Truck } from 'lucide-react';
import { ShipmentTracking } from './ShipmentTracking';

interface OrderTrackingPageProps {
  onBackHome: () => void;
}

export const OrderTrackingPage: React.FC<OrderTrackingPageProps> = ({ onBackHome }) => {
  const [trackingInput, setTrackingInput] = useState('');
  const [lookupValue, setLookupValue] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedTrackingNumber = trackingInput.trim();
    if (normalizedTrackingNumber) setLookupValue(normalizedTrackingNumber);
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <button onClick={onBackHome} className="mb-8 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[#6B655E] hover:text-[#2A2A2A] cursor-pointer">
        <ArrowLeft size={14} /> Back to Collection
      </button>
      <div className="max-w-2xl mb-10">
        <div className="flex items-center gap-2 text-[#A68A64] text-[10px] uppercase tracking-[0.25em] font-bold mb-3">
          <Truck size={15} /> Shipment Tracking
        </div>
        <h1 className="font-serif italic text-4xl text-[#2A2A2A]">Follow your order home.</h1>
        <p className="text-sm text-[#6B655E] mt-3">Enter your order number or shipment tracking number to see the latest delivery updates.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-2xl mb-10">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-3 text-[#6B655E]" />
          <input value={trackingInput} onChange={(event) => setTrackingInput(event.target.value)} placeholder="Order number or tracking number" aria-label="Order number or tracking number" className="w-full bg-[#F5F2ED] border border-[#DCD7D0] pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#2A2A2A]" />
        </div>
        <button type="submit" className="px-6 py-2.5 bg-[#2A2A2A] text-white text-[10px] uppercase tracking-[0.2em] font-bold cursor-pointer">Track Shipment</button>
      </form>
      {lookupValue ? <ShipmentTracking orderNumber={lookupValue} trackingNumber={lookupValue} /> : (
        <div className="border border-[#DCD7D0] bg-[#EAE5DF] p-8 text-center max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-[#6B655E]">Your shipment timeline will appear here</p>
        </div>
      )}
    </section>
  );
};
