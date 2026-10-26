import React, { useState, useMemo } from 'react';
import { Drawer } from '../../../components/common/Drawer';
import { Button } from '../../../components/common/Button';
import { Dropdown } from '../../../components/common/Dropdown';
import { Search, Clock, Zap, ArchiveRestore } from 'lucide-react';
import hawiTapCardImg from '../../../assets/illustrations/Hawi Tap Card.png';
import type { InventoryCard } from '../models';

export interface CardPoolDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryCards: InventoryCard[];
  onOpenRapidScan: () => void;
  onRestoreLostCard?: (uid: string) => void;
}

export const CardPoolDrawer: React.FC<CardPoolDrawerProps> = ({
  isOpen,
  onClose,
  inventoryCards,
  onOpenRapidScan,
  onRestoreLostCard,
}) => {
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'assigned' | 'lost'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const unassignedCount = useMemo(
    () => inventoryCards.filter((c) => c.status === 'unassigned').length,
    [inventoryCards]
  );
  const assignedCount = useMemo(
    () => inventoryCards.filter((c) => c.status === 'assigned').length,
    [inventoryCards]
  );
  const lostCount = useMemo(
    () => inventoryCards.filter((c) => c.status === 'lost').length,
    [inventoryCards]
  );

  const visibleCards = useMemo(() => {
    return inventoryCards.filter((card) => {
      const matchesFilter =
        filter === 'all' || card.status === filter;

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
          <p className="text-xs text-slate-500 font-medium">
            <span className="font-bold text-brand-700">{unassignedCount}</span> card{unassignedCount === 1 ? '' : 's'} available in pool
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
      <div className="space-y-4 text-slate-900">
        {/* Metric Summary Strip: Clean 3-column flat KPI card */}
        <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white p-3 text-center">
          <div className="px-2">
            <p className="text-xs font-medium text-slate-500">Total Cards</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5 tabular-nums">
              {inventoryCards.length}
            </p>
          </div>
          <div className="px-2">
            <p className="text-xs font-medium text-slate-500">Available Pool</p>
            <p className="text-xl font-extrabold text-brand-700 mt-0.5 tabular-nums">
              {unassignedCount}
            </p>
          </div>
          <div className="px-2">
            <p className="text-xs font-medium text-slate-500">Assigned</p>
            <p className="text-xl font-extrabold text-emerald-600 mt-0.5 tabular-nums">
              {assignedCount}
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-500">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by UID or student name…"
              className="w-full bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
            />
          </label>

          <Dropdown
            value={filter}
            onChange={(val) => setFilter(val as any)}
            options={[
              { value: 'all', label: `All Cards (${inventoryCards.length})` },
              { value: 'unassigned', label: `In Pool (${unassignedCount})` },
              { value: 'assigned', label: `Assigned (${assignedCount})` },
              { value: 'lost', label: `Lost / Revoked (${lostCount})` },
            ]}
          />
        </div>

        {/* Spacious Table: Combined Card + UID */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto max-h-[calc(100vh-320px)]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                <tr className="text-xs font-semibold text-slate-500">
                  <th className="px-4 py-3 whitespace-nowrap">Card &amp; UID</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 whitespace-nowrap">Assigned Student</th>
                  <th className="px-4 py-3 whitespace-nowrap">Date Added</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleCards.map((card) => (
                  <tr key={card.id || card.uid} className="hover:bg-slate-50/80 transition-colors">
                    {/* Card Number & UID combined */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <span className="font-extrabold text-brand-700 bg-brand-50 border border-brand-200/70 px-2 py-0.5 rounded-md text-[11px] tabular-nums shrink-0">
                          #{card.cardNumber || '—'}
                        </span>
                        <span className="font-mono font-bold text-slate-900 text-xs tracking-tight">
                          {card.uid}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {card.status === 'unassigned' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-brand-50 text-brand-700 border border-brand-200/60">
                          <i className="h-1.5 w-1.5 rounded-full bg-brand-700" />
                          In Pool
                        </span>
                      )}
                      {card.status === 'assigned' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          <i className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Assigned
                        </span>
                      )}
                      {card.status === 'lost' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                          <i className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          Lost / Revoked
                        </span>
                      )}
                    </td>

                    {/* Assigned Student */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {card.assignedToStudentName ? (
                        <span className="font-semibold text-slate-900">
                          {card.assignedToStudentName}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal italic">
                          Unassigned (Ready)
                        </span>
                      )}
                    </td>

                    {/* Date Added */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-500">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {card.registeredAt ? new Date(card.registeredAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }) : '—'}
                        </span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                      {card.status === 'lost' && (
                        <button
                          type="button"
                          onClick={() => onRestoreLostCard?.(card.uid)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-xl transition-all cursor-pointer shadow-2xs"
                        >
                          <ArchiveRestore className="w-3.5 h-3.5" />
                          Restore to Pool
                        </button>
                      )}
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
                <p className="text-sm font-bold text-slate-900">No cards match filters</p>
                <p className="text-xs text-slate-500 max-w-xs mt-0.5">
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
