import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { StudyResource } from '../../lib/study-library';
import type { MainsBlueprint } from '../../data/subject-pillars-data';
import ConceptExplorer from './ConceptExplorer';
import ReferenceExplorer from './ReferenceExplorer';

function AnswerOutline({ outline }: { outline: MainsBlueprint }) {
  const [part, setPart] = useState<'opening' | 'arguments' | 'conclusion'>('opening');
  const reducedMotion = useReducedMotion();
  return (
    <div className="study-answer">
      <p className="study-answer__context">{outline.marks}-mark writing prompt · editorial example</p>
      <div className="study-answer__parts" role="group" aria-label="Parts of the answer outline">
        {([
          ['opening', 'Opening'],
          ['arguments', 'Arguments'],
          ['conclusion', 'Conclusion'],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" aria-pressed={part === id} onClick={() => setPart(id)}>{label}</button>
        ))}
      </div>
      <motion.div
        key={part}
        initial={reducedMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.22 }}
        className="study-answer__body"
      >
        {part === 'opening' && <><h4>Set up the argument</h4><p>{outline.structure.introduction}</p></>}
        {part === 'arguments' && outline.structure.bodyArguments.map((argument, index) => (
          <section key={index}>
            <h4>{argument.heading}</h4>
            <ul>{argument.points.map((point, pointIndex) => <li key={pointIndex}>{point}</li>)}</ul>
          </section>
        ))}
        {part === 'conclusion' && <><h4>Bring the argument together</h4><p>{outline.structure.balancedConclusion}</p></>}
      </motion.div>
      {outline.structure.statutoryAnchors.length > 0 && (
        <details className="study-disclosure">
          <summary>References mentioned in the outline</summary>
          <ul>{outline.structure.statutoryAnchors.map((anchor, index) => <li key={index}>{anchor}</li>)}</ul>
        </details>
      )}
      <p className="study-material-note">Use this as a possible structure for your own answer. It is not an official marking scheme.</p>
    </div>
  );
}

export default function StudyResourceContent({ resource }: { resource: StudyResource }) {
  switch (resource.kind) {
    case 'note':
      return (
        <div className="study-note">
          <p className="study-note__overview">{resource.content.coreTheory}</p>
          {resource.content.criticalProvisions.length > 0 && (
            <details className="study-disclosure" open>
              <summary>Key details <span>{resource.content.criticalProvisions.length}</span></summary>
              <ul>{resource.content.criticalProvisions.map((provision, index) => <li key={index}>{provision}</li>)}</ul>
            </details>
          )}
          {resource.content.examinerPerspective && (
            <aside className="study-pointer">
              <h4>Keep this distinction in mind</h4>
              <p>{resource.content.examinerPerspective}</p>
            </aside>
          )}
        </div>
      );
    case 'exam-note':
      return (
        <div className="study-note">
          <p className="study-note__overview">{resource.content.examinerTrap}</p>
          <p className="study-material-note">An editorial study pointer. Question frequencies and examination predictions are not inferred from this note.</p>
        </div>
      );
    case 'map':
      return <ConceptExplorer map={resource.content} />;
    case 'reference':
      return <ReferenceExplorer matrix={resource.content} />;
    case 'answer':
      return <AnswerOutline outline={resource.content} />;
  }
}
