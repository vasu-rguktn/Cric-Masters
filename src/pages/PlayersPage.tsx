import React, { useState } from 'react';
import type { Player, PlayerRole } from '../types/player';
import { saveStoredPlayers } from '../services/storageService';
import { syncPlayersToSupabase } from '../services/supabaseService';
import { Plus, Edit2, Trash2, Star, Users, X, Save } from 'lucide-react';

interface PlayersPageProps {
  players: Player[];
  setPlayers: (players: Player[]) => void;
}

const ALL_ROLES: PlayerRole[] = [
  'All-rounder',
  'Pace Bowler',
  'Medium Pacer',
  'Spinner',
  'Leg Spinner',
  'Batsman',
  'Wicketkeeper',
];

export const PlayersPage: React.FC<PlayersPageProps> = ({ players, setPlayers }) => {
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

  const [nameInput, setNameInput] = useState<string>('');
  const [rolesInput, setRolesInput] = useState<PlayerRole[]>([]);
  const [isRegularInput, setIsRegularInput] = useState<boolean>(true);

  const resetForm = () => {
    setNameInput('');
    setRolesInput([]);
    setIsRegularInput(true);
    setIsAdding(false);
    setEditingPlayerId(null);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const handleStartEdit = (player: Player) => {
    setNameInput(player.name);
    setRolesInput([...player.roles]);
    setIsRegularInput(player.isRegular);
    setEditingPlayerId(player.id);
    setIsAdding(false);
  };

  const handleToggleRole = (role: PlayerRole) => {
    if (rolesInput.includes(role)) {
      setRolesInput(rolesInput.filter((r) => r !== role));
    } else {
      setRolesInput([...rolesInput, role]);
    }
  };

  const handleSavePlayer = () => {
    if (!nameInput.trim()) {
      alert('Please enter player name.');
      return;
    }
    if (rolesInput.length === 0) {
      alert('Select at least one role for the player.');
      return;
    }

    let updatedList: Player[];

    if (editingPlayerId) {
      updatedList = players.map((p) =>
        p.id === editingPlayerId
          ? {
              ...p,
              name: nameInput.trim(),
              roles: rolesInput,
              isRegular: isRegularInput,
            }
          : p
      );
    } else {
      const newPlayer: Player = {
        id: 'p-' + Date.now(),
        name: nameInput.trim(),
        roles: rolesInput,
        isRegular: isRegularInput,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      updatedList = [...players, newPlayer];
    }

    setPlayers(updatedList);
    saveStoredPlayers(updatedList);
    syncPlayersToSupabase(updatedList);
    resetForm();
  };

  const handleToggleActive = (player: Player) => {
    const updated = players.map((p) =>
      p.id === player.id ? { ...p, isActive: !p.isActive } : p
    );
    setPlayers(updated);
    saveStoredPlayers(updated);
    syncPlayersToSupabase(updated);
  };

  const handleDeletePlayer = (id: string) => {
    if (confirm('Delete player from active roster? Historical records will retain their name.')) {
      const updated = players.filter((p) => p.id !== id);
      setPlayers(updated);
      saveStoredPlayers(updated);
      syncPlayersToSupabase(updated);
    }
  };

  const regularPlayers = players.filter((p) => p.isRegular);
  const occasionalPlayers = players.filter((p) => !p.isRegular);

  return (
    <div className="space-y-6 pb-24 max-w-md mx-auto px-4 pt-4">
      <div className="bg-stadium-900 border border-stadium-800 rounded-3xl p-4 flex items-center justify-between shadow-md">
        <div>
          <h2 className="text-lg font-black text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-turf-400" />
            <span>PLAYER DATABASE</span>
          </h2>
          <p className="text-xs text-stadium-400">
            {players.filter((p) => p.isActive).length} Active Members
          </p>
        </div>

        <button
          onClick={handleStartAdd}
          className="px-3 py-2 bg-gradient-to-r from-turf-500 to-turf-600 text-stadium-950 font-extrabold text-xs rounded-xl shadow-md hover:brightness-110 transition-all flex items-center space-x-1"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>ADD PLAYER</span>
        </button>
      </div>

      {(isAdding || editingPlayerId) && (
        <div className="bg-stadium-900 border border-turf-500/40 rounded-3xl p-5 space-y-4 shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-stadium-800 pb-2">
            <h3 className="font-extrabold text-white text-sm">
              {editingPlayerId ? 'Edit Player' : 'Add New Faculty Player'}
            </h3>
            <button onClick={resetForm} className="text-stadium-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-stadium-300 block mb-1">
                Player Name
              </label>
              <input
                type="text"
                placeholder="e.g. Vasu, Reddy Sir..."
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full bg-stadium-950 border border-stadium-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-turf-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stadium-300 block mb-1">
                Roles (Select multiple)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_ROLES.map((role) => {
                  const isSelected = rolesInput.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleToggleRole(role)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                        isSelected
                          ? 'bg-turf-500 text-stadium-950 border-turf-400'
                          : 'bg-stadium-950 text-stadium-400 border-stadium-800 hover:border-stadium-700'
                      }`}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="text-xs font-bold text-stadium-300">
                Regular Player Priority
              </label>
              <button
                type="button"
                onClick={() => setIsRegularInput(!isRegularInput)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  isRegularInput
                    ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40'
                    : 'bg-stadium-800 text-stadium-400 border border-stadium-700'
                }`}
              >
                {isRegularInput ? 'REGULAR' : 'OTHER'}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2 border-t border-stadium-800">
            <button
              onClick={resetForm}
              className="flex-1 py-2 rounded-xl border border-stadium-700 text-stadium-300 font-bold text-xs hover:bg-stadium-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePlayer}
              className="flex-1 py-2 rounded-xl bg-turf-500 text-stadium-950 font-black text-xs shadow-md hover:brightness-110 flex items-center justify-center space-x-1"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Player</span>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-xs font-extrabold text-gold-400 uppercase tracking-wider px-1">
          <Star className="w-3.5 h-3.5 fill-gold-400" />
          <span>Regular Players ({regularPlayers.length})</span>
        </div>

        <div className="space-y-2">
          {regularPlayers.map((player) => (
            <div
              key={player.id}
              className={`bg-stadium-900 border border-stadium-800 rounded-2xl p-3.5 flex items-center justify-between transition-all ${
                !player.isActive ? 'opacity-40' : ''
              }`}
            >
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-sm text-white">{player.name}</span>
                  <Star className="w-3 h-3 text-gold-400 fill-gold-400" />
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {player.roles.map((r, i) => (
                    <span
                      key={i}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-stadium-950 text-stadium-400 border border-stadium-800 font-medium"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleToggleActive(player)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                    player.isActive
                      ? 'bg-turf-500/10 text-turf-400 border-turf-500/30'
                      : 'bg-stadium-800 text-stadium-500 border-stadium-700'
                  }`}
                >
                  {player.isActive ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => handleStartEdit(player)}
                  className="p-1.5 text-stadium-400 hover:text-white rounded-lg hover:bg-stadium-800"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeletePlayer(player.id)}
                  className="p-1.5 text-stadium-400 hover:text-rose-400 rounded-lg hover:bg-stadium-800"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center space-x-2 text-xs font-extrabold text-stadium-400 uppercase tracking-wider px-1">
          <Users className="w-3.5 h-3.5" />
          <span>Other Players ({occasionalPlayers.length})</span>
        </div>

        <div className="space-y-2">
          {occasionalPlayers.map((player) => (
            <div
              key={player.id}
              className={`bg-stadium-900 border border-stadium-800 rounded-2xl p-3.5 flex items-center justify-between transition-all ${
                !player.isActive ? 'opacity-40' : ''
              }`}
            >
              <div>
                <div className="font-extrabold text-sm text-white">{player.name}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {player.roles.map((r, i) => (
                    <span
                      key={i}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-stadium-950 text-stadium-400 border border-stadium-800 font-medium"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleToggleActive(player)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                    player.isActive
                      ? 'bg-turf-500/10 text-turf-400 border-turf-500/30'
                      : 'bg-stadium-800 text-stadium-500 border-stadium-700'
                  }`}
                >
                  {player.isActive ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => handleStartEdit(player)}
                  className="p-1.5 text-stadium-400 hover:text-white rounded-lg hover:bg-stadium-800"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeletePlayer(player.id)}
                  className="p-1.5 text-stadium-400 hover:text-rose-400 rounded-lg hover:bg-stadium-800"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
