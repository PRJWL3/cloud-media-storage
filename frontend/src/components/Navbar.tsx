import React from 'react';
import {
  Search,
  X,
  LayoutGrid,
  List,
  Sun,
  Moon,
  Filter,
  Activity,
} from 'lucide-react';
import { useDrive } from '../context/DriveContext';
import { useAuth } from '../context/AuthContext';
import type { FileFilterType } from '../types/drive';

interface NavbarProps {
  onOpenAuth: () => void;
  onOpenActivity: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, onOpenActivity, theme, onToggleTheme }) => {
  const {
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    viewMode,
    setViewMode,
  } = useDrive();
  const { currentUser } = useAuth();

  const filterOptions: { label: string; value: FileFilterType }[] = [
    { label: 'All Files', value: 'all' },
    { label: 'Images', value: 'image' },
    { label: 'Documents', value: 'document' },
    { label: 'Media', value: 'video' },
  ];

  return (
    <header className="navbar">
      {/* Search Bar */}
      <div className="search-container">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search in Drive (e.g. filename, .pdf, .png)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="search-clear-btn"
            onClick={() => setSearchQuery('')}
            title="Clear search"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="filter-chips">
        <Filter size={15} className="filter-icon" />
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            className={`filter-chip ${filterType === opt.value ? 'active' : ''}`}
            onClick={() => setFilterType(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Right Controls */}
      <div className="navbar-actions">
        {/* Grid / List View Toggle */}
        <div className="view-mode-group">
          <button
            className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <List size={16} />
          </button>
        </div>

        {/* Activity & Audit Trail Trigger */}
        <button
          className="icon-btn"
          onClick={onOpenActivity}
          title="Activity & Audit Trail"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', height: '36px' }}
        >
          <Activity size={16} />
          <span style={{ fontSize: '12px', fontWeight: 500 }}>Activity</span>
        </button>

        {/* Theme Toggle */}
        <button
          className="icon-btn theme-toggle-btn"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} monochrome`}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* User Account Trigger */}
        <button className="user-profile-btn" onClick={onOpenAuth} title="User account & switch">
          <div className="user-avatar-sm">{currentUser.name.charAt(0).toUpperCase()}</div>
          <span className="user-profile-name">{currentUser.name.split(' ')[0]}</span>
        </button>
      </div>
    </header>
  );
};
