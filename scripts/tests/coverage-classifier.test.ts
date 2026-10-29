import test from 'node:test';
import assert from 'node:assert';
import { determineCoverageScope } from '../../server-lib/news/coverage-classifier.js';

test('determineCoverageScope: User Feed Screenshot Cases', () => {
  // 1. RBI Mandya Bank
  const rbiMandya = determineCoverageScope({
    source: 'RBI',
    ministry: 'Reserve Bank of India',
    headline: 'Directions under Section 35A read with Section 56 of the Banking Regulation Act, 1949 – Lokapavani Mahila Sahakari Bank Niyamitha, Mandya - Extension of Period',
  });
  assert.strictEqual(rbiMandya, 'india');

  // 2. PIB ICAR Delhi Farmers
  const pibFarmers = determineCoverageScope({
    source: 'PIB',
    ministry: 'Ministry of Agriculture & Farmers Welfare',
    headline: 'ICAR Scientists and KVK Experts Engage Delhi Farmers Under Khet Bachao Abhiyan to Promote Soil Health and Rabi Crop Management',
  });
  assert.strictEqual(pibFarmers, 'india');

  // 3. PIB Green Hydrogen Standards
  const pibHydrogen = determineCoverageScope({
    source: 'PIB',
    ministry: 'Ministry of New and Renewable Energy',
    headline: 'India establishes Green Hydrogen benchmarks capping emissions at 2 kg CO2 and requiring 9 liters water per kilogram',
  });
  assert.strictEqual(pibHydrogen, 'india');

  // 4. PIB Space NGLV & SpaDeX
  const pibSpace = determineCoverageScope({
    source: 'PIB',
    ministry: 'Department of Space',
    headline: "India's New Era of Space Technology: ₹8,240 Crore NGLV Approval and Historic SpaDeX Docking Milestone",
  });
  assert.strictEqual(pibSpace, 'india');

  // 5. PIB France MoU
  const pibFrance = determineCoverageScope({
    source: 'PIB',
    ministry: 'Ministry of Culture',
    headline: "Ministry of Culture and Bibliothèque nationale de France Sign MoU to Strengthen India's Manuscript Heritage Preservation",
  });
  assert.strictEqual(pibFrance, 'cross_border');

  // 6. PIB Women & Child
  const pibWomen = determineCoverageScope({
    source: 'PIB',
    ministry: 'Ministry of Women and Child Development',
    headline: 'Union Women and Child Development Minister launches Poshan Tracker enhancements for Anganwadi centres',
  });
  assert.strictEqual(pibWomen, 'india');
});

test('determineCoverageScope: Bilateral & International Cases', () => {
  // MEA Bilateral
  const mea = determineCoverageScope({
    source: 'MEA',
    ministry: 'Ministry of External Affairs',
    headline: 'India and France sign Maritime Domain Logistics Support Agreement in Paris',
  });
  assert.strictEqual(mea, 'cross_border');

  // WTO Dispute Settlement
  const wto = determineCoverageScope({
    source: 'WTO',
    ministry: 'World Trade Organization',
    headline: 'Dispute Settlement Body adopts panel report regarding cross-border steel countervailing duties',
  });
  assert.strictEqual(wto, 'international');

  // ADMM-Plus Regional Defence
  const admm = determineCoverageScope({
    source: 'PIB',
    ministry: 'Ministry of Defence',
    headline: 'India is committed to collective regional security and counter-terrorism, offering battle-tested experiences to ADMM-Plus partners',
  });
  assert.strictEqual(admm, 'cross_border');

  // US Fed Rate Decision
  const usFed = determineCoverageScope({
    source: 'THE HINDU',
    ministry: 'International Finance',
    headline: 'US Federal Reserve cuts benchmark interest rate by 25 basis points amid slowing inflation',
  });
  assert.strictEqual(usFed, 'international');
});

