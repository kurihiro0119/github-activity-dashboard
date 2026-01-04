import { useState, useMemo, useEffect, useRef } from 'react'
import './RepositoryFilter.css'

interface RepositoryFilterProps {
  repositories: string[]
  selectedRepos: string[]
  onChange: (repos: string[]) => void
}

function RepositoryFilter({ repositories, selectedRepos, onChange }: RepositoryFilterProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const filteredRepos = useMemo(() => {
    if (!searchTerm) return repositories
    return repositories.filter((repo) =>
      repo.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [repositories, searchTerm])

  const handleToggle = (repo: string) => {
    const newRepos = selectedRepos.includes(repo)
      ? selectedRepos.filter((r) => r !== repo)
      : [...selectedRepos, repo]
    console.log('RepositoryFilter: リポジトリ選択変更', { repo, newRepos, oldRepos: selectedRepos })
    onChange(newRepos)
  }

  const handleSelectAll = () => {
    if (selectedRepos.length === filteredRepos.length) {
      onChange([])
    } else {
      onChange([...new Set([...selectedRepos, ...filteredRepos])])
    }
  }

  const handleClear = () => {
    onChange([])
  }

  return (
    <div className="repository-filter">
      <label>リポジトリ:</label>
      <div className="repo-filter-container" ref={containerRef}>
        <div className="repo-filter-header">
          <input
            type="text"
            placeholder="検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="repo-search-input"
          />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="toggle-btn"
            aria-label={isOpen ? '閉じる' : '開く'}
          >
            {isOpen ? '▲' : '▼'}
          </button>
        </div>
        {isOpen && (
          <div className="repo-list-container">
            <div className="repo-list-header">
              <button onClick={handleSelectAll} className="select-all-btn">
                {selectedRepos.length === filteredRepos.length ? 'すべて解除' : 'すべて選択'}
              </button>
              {selectedRepos.length > 0 && (
                <button onClick={handleClear} className="clear-btn">
                  クリア
                </button>
              )}
            </div>
            <div className="repo-list">
              {filteredRepos.length === 0 ? (
                <div className="no-repos">該当するリポジトリがありません</div>
              ) : (
                filteredRepos.map((repo) => (
                  <label key={repo} className="repo-checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedRepos.includes(repo)}
                      onChange={() => handleToggle(repo)}
                      className="repo-checkbox"
                    />
                    <span className="repo-name">{repo}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}
        {selectedRepos.length > 0 && (
          <div className="selected-repos">
            <span className="selected-count">{selectedRepos.length}件選択中</span>
            <div className="selected-tags">
              {selectedRepos.slice(0, 3).map((repo) => (
                <span key={repo} className="selected-tag">
                  {repo}
                </span>
              ))}
              {selectedRepos.length > 3 && (
                <span className="selected-tag more">+{selectedRepos.length - 3}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RepositoryFilter

