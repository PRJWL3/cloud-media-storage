import React from 'react';
import { ChevronRight, FolderPlus, UploadCloud, Trash2, ArrowLeft } from 'lucide-react';
import { useDrive } from '../context/DriveContext';

interface BreadcrumbsProps {
  onOpenCreateFolder: () => void;
  onTriggerUpload: () => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  onOpenCreateFolder,
  onTriggerUpload,
}) => {
  const {
    breadcrumbs,
    currentFolderId,
    setCurrentFolderId,
    currentView,
    allCurrentItemsCount,
    emptyTrash,
  } = useDrive();

  const getViewTitle = () => {
    switch (currentView) {
      case 'shared':
        return 'Shared with me';
      case 'starred':
        return 'Starred Files';
      case 'trash':
        return 'Trash';
      default:
        return 'My Drive';
    }
  };

  const handleBackToParent = () => {
    if (breadcrumbs.length > 1) {
      const parentCrumb = breadcrumbs[breadcrumbs.length - 2];
      setCurrentFolderId(parentCrumb.id);
    }
  };

  return (
    <div className="breadcrumbs-bar">
      {/* Left Trail */}
      <div className="breadcrumbs-trail">
        {currentView === 'my-drive' ? (
          <>
            {currentFolderId !== null && (
              <button
                className="breadcrumb-back-btn"
                onClick={handleBackToParent}
                title="Go to parent folder"
              >
                <ArrowLeft size={16} />
              </button>
            )}

            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.id ?? 'root'}>
                  {idx > 0 && <ChevronRight size={14} className="breadcrumb-separator" />}
                  <button
                    className={`breadcrumb-item ${isLast ? 'active' : ''}`}
                    onClick={() => !isLast && setCurrentFolderId(crumb.id)}
                    disabled={isLast}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              );
            })}
          </>
        ) : (
          <h2 className="view-header-title">{getViewTitle()}</h2>
        )}

        <span className="items-counter-badge">{allCurrentItemsCount} items</span>
      </div>

      {/* Right Quick Actions */}
      <div className="breadcrumbs-actions">
        {currentView === 'trash' ? (
          allCurrentItemsCount > 0 && (
            <button
              className="btn btn-secondary danger-hover"
              onClick={() => {
                if (confirm('Are you sure you want to permanently delete all items in Trash?')) {
                  emptyTrash();
                }
              }}
            >
              <Trash2 size={15} />
              <span>Empty Trash</span>
            </button>
          )
        ) : currentView === 'my-drive' ? (
          <>
            <button className="btn btn-secondary" onClick={onOpenCreateFolder}>
              <FolderPlus size={15} />
              <span>New Folder</span>
            </button>
            <button className="btn btn-primary" onClick={onTriggerUpload}>
              <UploadCloud size={15} />
              <span>Upload Files</span>
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};
