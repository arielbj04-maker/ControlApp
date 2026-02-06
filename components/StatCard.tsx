import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
}

const colorMap: Record<string, { bg: string; text: string }> = {
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-600' },
  red: { bg: 'bg-red-100', text: 'text-red-600' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
  green: { bg: 'bg-green-100', text: 'text-green-600' },
};

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
  const colors = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg ${colors.bg} ${colors.text}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
};
