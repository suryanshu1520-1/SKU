import { useId, useState, type FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, ExternalLink, RotateCcw } from 'lucide-react';
import './LandingTrial.css';

interface LandingTrialProps {
  onNavigateArena: () => void;
}

// Canonical text and key: CSE-2024-GS1-A-Q08 in
// tark_pyq_handoff/data/cse2024_gs1_seriesA_questions.csv.
// Explanation cross-check: verified_pyqs_15yr.json,
// db_62bd80c9-9e61-4038-b3a1-98ca7972f7cb.
// This isolated preview never creates a scored attempt or persists an answer.
const SAMPLE = {
  countries: ['Finland', 'Germany', 'Norway', 'Russia'],
  answers: ['Only one', 'Only two', 'Only three', 'All four'],
  correctIndex: 1,
  sourceUrl: 'https://upsc.gov.in/sites/default/files/QP-CSP-24-GENERAL-STUDIES-PAPER-I-180624.pdf#page=5',
};

export default function LandingTrial({ onNavigateArena }: LandingTrialProps) {
  const instanceId = useId();
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const reduceMotion = useReducedMotion();
  const isCorrect = selected === SAMPLE.correctIndex;
  const questionId = `${instanceId}-question`;
  const promptId = `${instanceId}-prompt`;
  const duration = reduceMotion ? 0 : 0.4;

  function checkAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected !== null && !submitted) setSubmitted(true);
  }

  function retry() {
    setSubmitted(false);
    setSelected(null);
  }

  return (
    <section className="landing-trial" aria-labelledby={questionId}>
      <header className="landing-trial__header">
        <span className="landing-trial__eyebrow">Practice preview</span>
        <a href={SAMPLE.sourceUrl} target="_blank" rel="noopener noreferrer">
          UPSC Prelims 2024 · Q08 <ExternalLink size={12} aria-hidden="true" />
          <span className="landing-trial__sr-only"> — original paper, opens in a new tab</span>
        </a>
      </header>

      <div className="landing-trial__paper">
        <h3 className="landing-trial__question" id={questionId}>Consider the following countries:</h3>
        <ol className="landing-trial__countries">
          {SAMPLE.countries.map((country, index) => {
            const bordersNorthSea = index === 1 || index === 2;
            return (
              <li
                key={country}
                className={submitted && bordersNorthSea ? 'landing-trial__country is-evidence' : 'landing-trial__country'}
              >
                <span className="landing-trial__country-number" aria-hidden="true">{index + 1}.</span>
                <span>{country}</span>
                {submitted && bordersNorthSea && <Check size={14} aria-label="Borders the North Sea" />}
              </li>
            );
          })}
        </ol>
        <p id={promptId} className="landing-trial__prompt">
          How many of the above countries have a border with the North Sea?
        </p>

        <form onSubmit={checkAnswer}>
          <fieldset className="landing-trial__options" disabled={submitted} aria-describedby={promptId}>
            <legend className="landing-trial__sr-only">Choose one answer</legend>
            {SAMPLE.answers.map((answer, index) => {
              const correct = submitted && index === SAMPLE.correctIndex;
              const incorrect = submitted && selected === index && !correct;
              const optionClass = [
                'landing-trial__option',
                selected === index ? 'is-selected' : '',
                correct ? 'is-correct' : '',
                incorrect ? 'is-incorrect' : '',
              ].filter(Boolean).join(' ');

              return (
                <label className={optionClass} key={answer}>
                  <input
                    type="radio"
                    name={`${instanceId}-answer`}
                    value={index}
                    checked={selected === index}
                    onChange={() => setSelected(index)}
                  />
                  <span className="landing-trial__option-letter" aria-hidden="true">
                    {correct ? <Check size={13} /> : String.fromCharCode(97 + index)}
                  </span>
                  <span>{answer}</span>
                  {correct && <span className="landing-trial__sr-only"> — correct answer</span>}
                  {incorrect && <span className="landing-trial__sr-only"> — your answer, incorrect</span>}
                </label>
              );
            })}
          </fieldset>

          <div className="landing-trial__sr-only" role="status" aria-live="polite" aria-atomic="true">
            {submitted ? `${isCorrect ? 'Correct.' : 'The correct answer is B: Only two.'} Germany and Norway border the North Sea. Finland and Russia do not.` : ''}
          </div>

          <AnimatePresence initial={false}>
            {submitted && (
              <motion.div
                key="evidence"
                className="landing-trial__result-frame"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="landing-trial__result">
                  <p className="landing-trial__result-title">
                    {isCorrect ? 'Exactly. Germany and Norway.' : 'Two countries. Germany and Norway.'}
                  </p>
                  <p>
                    Finland meets the Baltic Sea. Russia has Baltic and Arctic coastlines,
                    but no North Sea coast. The distinction is the sea, not the region.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <footer className="landing-trial__actions">
            <button
              className="landing-trial__check"
              type={submitted ? 'button' : 'submit'}
              disabled={!submitted && selected === null}
              onClick={submitted ? retry : undefined}
            >
              {submitted && <RotateCcw size={14} aria-hidden="true" />}
              {submitted ? 'Try again' : 'Check answer'}
              {!submitted && <ArrowRight size={15} aria-hidden="true" />}
            </button>
            <a
              className="landing-trial__arena"
              href="/arena"
              onClick={(event) => {
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                onNavigateArena();
              }}
            >
              Open Test Arena <ArrowRight size={15} aria-hidden="true" />
            </a>
          </footer>
        </form>
      </div>
      <p className="landing-trial__note">A sample question. Your practice record stays untouched.</p>
    </section>
  );
}
