import { useId, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { MindMapNode } from '../../data/subject-pillars-data';
import './ConceptExplorer.css';

export interface ConceptExplorerProps {
  map: MindMapNode;
}

function choiceLabel(detail: string, sequential: boolean): string {
  const colon = detail.indexOf(':');
  if (colon < 0) return detail;
  const prefix = detail.slice(0, colon).trim();
  // Generic numbered labels repeat the visible step number without explaining it.
  if (sequential && /^(step|rule)\s+\d+$/i.test(prefix)) {
    return detail.slice(colon + 1).trim();
  }
  return prefix || detail;
}

function Explorer({ map }: ConceptExplorerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const panelId = useId();
  const questionId = useId();
  const sequential = map.structureType === 'sequential';
  const selectedDetail = map.details[selectedIndex];
  const example = map.examples?.[selectedIndex];

  if (!map.details.length) {
    return <p className="study-concept-empty">This explanation has no items to explore yet.</p>;
  }

  return (
    <div className="study-concept">
      {map.rootQuestion && <p className="study-concept-question" id={questionId}>{map.rootQuestion}</p>}
      <div className="study-concept-workspace">
        <div
          className="study-concept-choices"
          role="group"
          aria-label={sequential ? 'Choose a step' : 'Choose a category'}
          aria-describedby={map.rootQuestion ? questionId : undefined}
        >
          {map.details.map((detail, index) => (
            <button
              type="button"
              key={`${map.id}-${index}`}
              className="study-concept-choice"
              aria-pressed={selectedIndex === index}
              aria-controls={panelId}
              onClick={() => setSelectedIndex(index)}
            >
              {sequential && <span className="study-concept-number" aria-hidden="true">{index + 1}</span>}
              <span>{choiceLabel(detail, sequential)}</span>
              {sequential && <span className="study-concept-sr-only">, step {index + 1} of {map.details.length}</span>}
            </button>
          ))}
        </div>

        <div className="study-concept-reading" id={panelId}>
          <p className="study-concept-position">
            {sequential ? `Step ${selectedIndex + 1} of ${map.details.length}` : 'Selected category'}
          </p>
          <motion.div
            key={`${map.id}-${selectedIndex}`}
            className="study-concept-content"
            initial={reduceMotion ? false : { opacity: 0.6, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.26, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="study-concept-detail">{selectedDetail}</p>
            {example?.trim() && (
              <div className="study-concept-example">
                <h4>Illustrative example</h4>
                <p>{example}</p>
              </div>
            )}
          </motion.div>
          {sequential && (
            <div className="study-concept-pagination" aria-label="Move between steps">
              <button
                type="button"
                disabled={selectedIndex === 0}
                onClick={() => setSelectedIndex((current) => Math.max(0, current - 1))}
              >
                Previous step
              </button>
              <button
                type="button"
                disabled={selectedIndex === map.details.length - 1}
                onClick={() => setSelectedIndex((current) => Math.min(map.details.length - 1, current + 1))}
              >
                Next step
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConceptExplorer({ map }: ConceptExplorerProps) {
  return <Explorer key={map.id} map={map} />;
}
