import React from 'react';

export default function LoadingSkeleton({ type = 'cards', count = 4 }) {
  if (type === 'cards') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-5 h-28 flex flex-col justify-between">
            <div className="h-3.5 bg-slate-200 rounded w-1/3"></div>
            <div className="h-7 bg-slate-200 rounded w-1/2"></div>
            <div className="h-3 bg-slate-100 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden animate-pulse">
        <div className="h-12 bg-slate-100 border-b border-slate-200/80"></div>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-14 border-b border-slate-100 flex items-center px-6 gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-200"></div>
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            <div className="h-4 bg-slate-100 rounded w-1/6 ml-auto"></div>
            <div className="h-4 bg-slate-100 rounded w-1/8"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'chart') {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-6"></div>
        <div className="h-64 bg-slate-100 rounded-lg flex items-end justify-around p-4 gap-4">
          <div className="w-12 bg-slate-200 rounded-t h-48"></div>
          <div className="w-12 bg-slate-200 rounded-t h-32"></div>
          <div className="w-12 bg-slate-200 rounded-t h-56"></div>
          <div className="w-12 bg-slate-200 rounded-t h-20"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-1/3"></div>
      <div className="h-32 bg-slate-100 rounded-xl"></div>
    </div>
  );
}
