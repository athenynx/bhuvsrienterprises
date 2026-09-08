import React from 'react';
import { ProductCategory } from '../types';

interface HeroBannerProps {
  onSelectCategory: (cat: ProductCategory | 'all') => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onSelectCategory,
}) => {
  return (
    <div id="hero-geometric-balance" className="flex flex-col border-b border-[#DCD7D0]">
      
      {/* Split Hero Section */}
      <section className="flex flex-col lg:flex-row min-h-125 border-b border-[#DCD7D0]">
        
        {/* Left Editorial Narrative */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 lg:p-20 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-[#DCD7D0] bg-[#F5F2ED]">
          <div className="text-[10px] uppercase tracking-[0.35em] text-[#A68A64] mb-5 font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#A68A64]"></span>
            <span>Quality.Creativity.Trust.</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif italic leading-[0.98] mb-6 text-[#2A2A2A] max-w-xl">
            Where art meets elegance.
          </h1>

          <p className="text-sm sm:text-base text-[#6B655E] max-w-md leading-relaxed mb-8 font-light">
            A considered edit of handloom sarees, modern clothing, jewellery, accessories, and gifts for the moments worth remembering.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              id="hero-shop-collection-btn"
              onClick={() => onSelectCategory('all')}
              className="px-7 py-3.5 bg-[#2A2A2A] text-white text-[11px] uppercase tracking-[0.2em] hover:bg-[#404040] transition-colors cursor-pointer"
            >
              Shop the collection
            </button>
            <button onClick={() => onSelectCategory('gifts')} className="px-7 py-3.5 border border-[#2A2A2A] text-[#2A2A2A] text-[11px] uppercase tracking-[0.2em] hover:bg-[#EAE5DF] transition-colors cursor-pointer">
              Explore gifts
            </button>
          </div>

          <div className="flex items-center gap-5 mt-10 pt-5 border-t border-[#DCD7D0] max-w-md text-[9px] uppercase tracking-[0.18em] text-[#6B655E]">
            <span>Curated pieces</span><span className="w-1 h-1 bg-[#A68A64]"></span><span>Secure checkout</span><span className="w-1 h-1 bg-[#A68A64]"></span><span>Express delivery</span>
          </div>
        </div>

        {/* Right Geometric Hero Image Panel */}
        <div className="w-full lg:w-1/2 bg-[#EAE5DF] p-6 sm:p-10 lg:p-14 flex items-center justify-center relative min-h-90 lg:min-h-125">
          <div className="w-full aspect-4/3 lg:aspect-auto lg:h-95 border border-[#DCD7D0] relative overflow-hidden group shadow-xs">
            <img
              src="/images/hero-sarees.jpg"
              alt="BhuviSri Enterprises Silk Drape"
              className="w-full h-full object-contain object-center transform transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent"></div>
            
            <div className="absolute bottom-6 left-6 text-white">
              <span className="text-[9px] uppercase tracking-[0.3em] font-medium text-[#DCD7D0] block mb-1">
                Pure Handloom Mulberry Silk
              </span>
              <p className="font-serif italic text-2xl"></p>
            </div>
          </div>

          {/* Floating Luxury Tag */}
          <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 bg-white/90 backdrop-blur-sm px-4 py-3 border border-[#DCD7D0] text-[10px] tracking-[0.25em] uppercase font-bold text-[#2A2A2A] shadow-xs">
            collection 2026
          </div>
        </div>

      </section>

      {/* Category Showcase */}
      <section className="grid grid-cols-2 md:grid-cols-5 bg-[#F5F2ED]">
        
        {/* Sarees */}
        <div
          onClick={() => onSelectCategory('sarees')}
          className="border-b md:border-b-0 border-r border-[#DCD7D0] p-6 sm:p-8 flex flex-col justify-between group hover:bg-white transition-colors cursor-pointer"
        >
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#6B655E] group-hover:text-[#A68A64] transition-colors font-bold mb-3">
              01 / Sarees
            </div>
            <div className="w-full aspect-3/4 bg-[#F0EDE9] mb-4 overflow-hidden border border-[#DCD7D0]">
              <img 
                src="/images/hero-sarees.jpg" 
                alt="Sarees" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
          <div className="text-sm font-serif italic text-[#2A2A2A] flex items-center justify-between">
            <span>Heritage Weaves</span>
            <span className="text-xs tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </div>
        </div>

        {/*  Ethnic */}
        <div
          onClick={() => onSelectCategory('ethnic')}
          className="border-b md:border-b-0 border-r border-[#DCD7D0] p-6 sm:p-8 flex flex-col justify-between group hover:bg-white transition-colors cursor-pointer"
        >
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#6B655E] group-hover:text-[#A68A64] transition-colors font-bold mb-3">
              02 / Ethnic
            </div>
            <div className="w-full aspect-3/4 bg-[#F0EDE9] mb-4 overflow-hidden border border-[#DCD7D0]">
              <img 
                src="/images/ethnic-temp.jpg" 
                alt="Ethnic" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
          <div className="text-sm font-serif italic text-[#2A2A2A] flex items-center justify-between">
            <span>ethnic wear</span>
            <span className="text-xs tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </div>
        </div>

        {/*  Western */}
        <div
          onClick={() => onSelectCategory('western')}
          className="border-r border-[#DCD7D0] p-6 sm:p-8 flex flex-col justify-between group hover:bg-white transition-colors cursor-pointer"
        >
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#6B655E] group-hover:text-[#A68A64] transition-colors font-bold mb-3">
              03 / Western
            </div>
            <div className="w-full aspect-3/4 bg-[#F0EDE9] mb-4 overflow-hidden border border-[#DCD7D0]">
              <img 
                src="/images/western-temp.jpg" 
                alt="Western" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
          <div className="text-sm font-serif italic text-[#2A2A2A] flex items-center justify-between">
            <span>western wear</span>
            <span className="text-xs tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </div>
        </div>

        {/*  Accessories & Jewels */}
        <div
          onClick={() => onSelectCategory('accessories')}
          className="border-t md:border-t-0 md:border-r border-[#DCD7D0] p-6 sm:p-8 flex flex-col justify-between group hover:bg-white transition-colors cursor-pointer"
        >
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#6B655E] group-hover:text-[#A68A64] transition-colors font-bold mb-3">
              04 / Jewels & Bags
            </div>
            <div className="w-full aspect-3/4 bg-[#F0EDE9] mb-4 overflow-hidden border border-[#DCD7D0]">
              <img 
                src="/images/jewels-bags-temp.jpg" 
                alt="Accessories" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
          <div className="text-sm font-serif italic text-[#2A2A2A] flex items-center justify-between">
            <span>accessories & jewels</span>
            <span className="text-xs tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </div>
        </div>

        {/* Gifts & Novelties */}
        <div
          onClick={() => onSelectCategory('gifts')}
          className="border-t md:border-t-0 p-6 sm:p-8 flex flex-col justify-between group hover:bg-white transition-colors cursor-pointer"
        >
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#6B655E] group-hover:text-[#A68A64] transition-colors font-bold mb-3">
              05 / Gifts
            </div>
            <div className="w-full aspect-3/4 bg-[#F0EDE9] mb-4 overflow-hidden border border-[#DCD7D0]">
              <img
                src="/images/gifts.jpg"
                alt="Gifts and novelties"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
          <div className="text-sm font-serif italic text-[#2A2A2A] flex items-center justify-between">
            <span>Gifts & novelties</span>
            <span className="text-xs tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </div>
        </div>

      </section>

    </div>
  );
};
