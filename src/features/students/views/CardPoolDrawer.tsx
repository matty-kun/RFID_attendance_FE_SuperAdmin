import React, { useState, useMemo } from 'react';
import { Drawer } from '../../../components/common/Drawer';
import { Button } from '../../../components/common/Button';
import { Dropdown } from '../../../components/common/Dropdown';
import { Search, Clock, Zap } from 'lucide-react';
import hawiTapCardImg from '../../../assets/illustrations/Hawi Tap Card.png';
import type { InventoryCard } from '../models';

export interface CardPoolDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryCards: InventoryCard[];
  onOpenRapidScan: () => void;
}

export const CardPoolDrawer: React.FC<CardPoolDrawerProps> = ({
  isOpen,
  onClose,
  inventoryCards,
  onOpenRapidScan,
}) => {
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const unassignedCount = useMemo(
    () => inventoryCards.filter((c) => c.status === 'unassigned').length,
    [inventoryCards]
  );
  const assignedCount = inventoryCards.length - unassignedCount;

  const visibleCards = useMemo(() => {
    return inventoryCards.filter((card) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'unassigned' && card.status === 'unassigned') ||
        (filter === 'assigned' && card.status === 'assigned');

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        card.uid.toLowerCase().includes(q) ||
        String(card.cardNumber).includes(q) ||
        (card.assignedToStudentName && card.assignedToStudentName.toLowerCase().includes(q));

      return matchesFilter && matchesSearch;
    });
  }, [inventoryCards, filter, searchQuery]);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Card Inventory Pool"
      description="Physical RFID cards registered in stock ready for student assignment."
      maxWidth="3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <p className="text-xs text-[#756883] font-medium">
            <span className="font-bold text-[#7026B7]">{unassignedCount}</span> card{unassignedCount === 1 ? '' : 's'} available in pool
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onOpenRapidScan();
              }}
              leftIcon={<Zap className="w-3.5 h-3.5 fill-current" />}
            >
              Rapid Scan Cards
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Metric Summary Strip: Clean 3-column flat KPI card */}
        <div className="grid grid-cols-3 divide-x divide-[#E5E0EB] rounded-2xl border border-[#E5E0EB] bg-white p-3 text-center">
          <div className="px-2">
            <p className="text-xs font-medium text-[#756883]">Total Cards</p>
            <p className="text-xl font-extrabold text-[#24133F] mt-0.5 tabular-nums">
              {inventoryCards.length}
            </p>
          </div>
          <div className="px-2">
            <p className="text-xs font-medium text-[#756883]">Available Pool</p>
            <p className="text-xl font-extrabold text-[#7026B7] mt-0.5 tabular-nums">
              {unassignedCount}
            </p>
          </div>
          <div className="px-2">
            <p className="text-xs font-medium text-[#756883]">Assigned</p>
            <p className="text-xl font-extrabold text-[#16883F] mt-0.5 tabular-nums">
              {assignedCount}
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-[#756883]">
            <Search className="h-4 w-4 shrink-0 text-[#A59AAB]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by UID or student name…"
              className="w-full bg-transparent text-xs text-[#24133F] outline-none placeholder:text-[#A59AAB]"
            />
          </label>

          <Dropdown
            value={filter}
            onChange={(val) => setFilter(val as 'all' | 'unassigned' | 'assigned')}
            options={[
              { value: 'all', label: `All Cards (${inventoryCards.length})` },
              { value: 'unassigned', label: `In Pool (${unassignedCount})` },
              { value: 'assigned', label: `Assigned (${assignedCount})` },
            ]}
          />
        </div>

        {/* Spacious Table: Combined Card + UID, Unwrapped Columns */}
        <div className="overflow-hidden rounded-2xl border border-[#E5E0EB] bg-white">
          <div className="overflow-x-auto max-h-[calc(100vh-320px)]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#FAF8FC] border-b border-[#E5E0EB] z-10">
                <tr className="text-xs font-semibold text-[#756883]">
                  <th className="px-4 py-3 whitespace-nowrap">Card &amp; UID</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 whitespace-nowrap">Assigned Student</th>
                  <th className="px-4 py-3 whitespace-nowrap">Date Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E8FC]">
                {visibleCards.map((card) => (
                  <tr key={card.uid} className="hover:bg-[#FAF8FC] transition-colors">
                    {/* Card Number & UID combined */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <span className="font-extrabold text-[#7026B7] bg-purple-50 border border-purple-200/70 px-2 py-0.5 rounded-md text-[11px] tabular-nums shrink-0">
                          #{card.cardNumber || '—'}
                        </span>
                        <span className="font-mono font-bold text-[#24133F] text-xs tracking-tight">
                          {card.uid}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          card.status === 'unassigned'
                            ? 'bg-purple-50 text-[#7026B7] border border-purple-200/60'
                            : 'bg-emerald-50 text-[#16883F] border border-emerald-200/60'
                        }`}
                      >
                        <i
                          className={`h-1.5 w-1.5 rounded-full ${
                            card.status === 'unassigned' ? 'bg-[#7026B7]' : 'bg-[#17B556]'
                          }`}
                        />
                        {card.status === 'unassigned' ? 'In Pool' : 'Assigned'}
                      </span>
                    </td>

                    {/* Assigned Student */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {card.assignedToStudentName ? (
                        <span className="font-semibold text-[#24133F]">
                          {card.assignedToStudentName}
                        </span>
                      ) : (
                        <span className="text-[#A59AAB] font-normal italic">
                          Unassigned (Ready)
                        </span>
                      )}
                    </td>

                    {/* Date Added */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-[#756883]">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Clock className="w-3.5 h-3.5 text-[#A59AAB] shrink-0" />
                        <span>
                          {new Date(card.registeredAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!visibleCards.length && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <img
                  src={hawiTapCardImg}
                  alt="No inventory cards"
                  className="w-20 h-20 object-contain mb-2"
                />
                <p className="text-sm font-bold text-[#24133F]">No cards match filters</p>
                <p className="text-xs text-[#756883] max-w-xs mt-0.5">
                  Swipe cards using the rapid continuous scanner to build your pool.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
};
