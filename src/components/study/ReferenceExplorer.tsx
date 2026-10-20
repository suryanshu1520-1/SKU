import { useId, useMemo, useState } from 'react';
import type { StaticFactMatrix } from '../../data/subject-pillars-data';
import './ReferenceExplorer.css';

interface ReferenceExplorerProps {
  matrix: StaticFactMatrix;
}

/** Two ways to use the same reference: compare entries or recall their details. */
export function ReferenceExplorer({ matrix }: ReferenceExplorerProps) {
  return <ReferenceExplorerBody key={matrix.id} matrix={matrix} />;
}

function ReferenceExplorerBody({ matrix }: ReferenceExplorerProps) {
  const id = useId();
  const [view, setView] = useState<'table' | 'recall'>('table');
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const filteredRows = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return matrix.rows
      .map((cells, originalIndex) => ({ cells, originalIndex }))
      .filter(({ cells }) => !term || cells.some(cell => cell.toLocaleLowerCase().includes(term)));
  }, [matrix.rows, query]);
  const columnCount = Math.max(matrix.headers.length, ...matrix.rows.map(row => row.length), 0);
  const headers = Array.from({ length: columnCount }, (_, index) => matrix.headers[index] || `Column ${index + 1}`);
  const safePosition = Math.min(position, Math.max(filteredRows.length - 1, 0));
  const currentRow = filteredRows[safePosition]?.cells;
  const total = matrix.rows.length;

  function updateQuery(value: string) {
    setQuery(value);
    setPosition(0);
    setRevealed(false);
  }

  function changeView(next: 'table' | 'recall') {
    setView(next);
    setRevealed(false);
  }

  function moveTo(next: number) {
    setPosition(next);
    setRevealed(false);
  }

  return (
    <section className="study-reference" aria-label={`${matrix.title} reference`}>
      <div className="study-reference-tools">
        <div className="study-reference-view" role="group" aria-label="Reference view">
          <button type="button" aria-pressed={view === 'table'} onClick={() => changeView('table')}>Table</button>
          <button type="button" aria-pressed={view === 'recall'} onClick={() => changeView('recall')}>Recall</button>
        </div>
        <p className="study-reference-count" role="status" aria-live="polite" aria-atomic="true">
          <span>{filteredRows.length}</span> of <span>{total}</span> {total === 1 ? 'entry' : 'entries'}
        </p>
      </div>

      <div className="study-reference-search">
        <label htmlFor={`${id}-search`}>Find an entry</label>
        <div className="study-reference-search-field">
          <input
            id={`${id}-search`}
            type="search"
            autoComplete="off"
            value={query}
            onChange={event => updateQuery(event.target.value)}
            placeholder="Search every column"
            aria-controls={`${id}-results`}
          />
          {query && <button type="button" onClick={() => updateQuery('')}>Clear</button>}
        </div>
      </div>

      <div id={`${id}-results`}>
        {filteredRows.length === 0 ? (
          <div className="study-reference-empty">
            <p>{total === 0 ? 'There are no entries in this reference yet.' : 'No entries match your search.'}</p>
            {query && <button type="button" onClick={() => updateQuery('')}>Show all entries</button>}
          </div>
        ) : view === 'table' ? (
          <>
            <p id={`${id}-table-help`} className="study-reference-scroll-help">Scroll across to compare every column.</p>
            <div
              className="study-reference-table-region"
              role="region"
              tabIndex={0}
              aria-label={`${matrix.title} comparison table`}
              aria-describedby={`${id}-table-help`}
            >
              <table className="study-reference-table">
                <caption className="study-reference-sr-only">{matrix.title}: {filteredRows.length} {filteredRows.length === 1 ? 'entry' : 'entries'}</caption>
                <thead>
                  <tr>{headers.map((header, index) => <th key={index} scope="col">{header}</th>)}</tr>
                </thead>
                <tbody>
                  {filteredRows.map(({ cells, originalIndex }) => (
                    <tr key={originalIndex}>
                      <th scope="row">{cells[0] || '—'}</th>
                      {headers.slice(1).map((_, index) => <td key={index}>{cells[index + 1] || '—'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : currentRow ? (
          <div className="study-reference-recall">
            <p className="study-reference-recall-instruction">Recall the details, then reveal them to compare.</p>
            <div className="study-reference-prompt" aria-live="polite" aria-atomic="true">
              <p>{headers[0]}</p>
              <h3>{currentRow[0] || '—'}</h3>
            </div>
            <button
              type="button"
              className="study-reference-reveal"
              aria-expanded={revealed}
              aria-controls={`${id}-details`}
              onClick={() => setRevealed(previous => !previous)}
            >
              {revealed ? 'Hide details' : 'Reveal details'}
            </button>
            <div
              key={filteredRows[safePosition].originalIndex}
              id={`${id}-details`}
              className={`study-reference-details${revealed ? ' is-revealed' : ''}`}
              aria-hidden={!revealed}
              inert={!revealed}
            >
              <div className="study-reference-details-clip">
                <dl>
                  {headers.slice(1).map((header, index) => (
                    <div key={index}>
                      <dt>{header}</dt>
                      <dd>{currentRow[index + 1] || '—'}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
            <div className="study-reference-pagination">
              <button type="button" disabled={safePosition === 0} onClick={() => moveTo(safePosition - 1)}>Previous</button>
              <p role="status" aria-live="polite" aria-atomic="true">
                <span>{safePosition + 1}</span> of <span>{filteredRows.length}</span>
              </p>
              <button type="button" disabled={safePosition >= filteredRows.length - 1} onClick={() => moveTo(safePosition + 1)}>Next</button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default ReferenceExplorer;
