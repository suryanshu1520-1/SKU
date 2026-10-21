import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STUDY_RESOURCES } from './study-library.js';
import {
  CANONICAL_NODE_IDS,
  LEGACY_TAG_TO_CANONICAL,
  STUDY_RESOURCE_MAPPINGS,
  getCanonicalNodesForResource,
  isValidCanonicalNodeId,
  resolveLegacyTagToCanonical,
  getResourcesForCanonicalNode,
} from './syllabus-mapping.js';

test('canonical syllabus node taxonomy contains exactly 137 nodes', () => {
  assert.equal(CANONICAL_NODE_IDS.size, 137);
  // Verify CSAT & Essay nodes are present
  assert.ok(isValidCanonicalNodeId('CSAT.RC'));
  assert.ok(isValidCanonicalNodeId('CSAT.QUAN'));
  assert.ok(isValidCanonicalNodeId('CSAT.REAS'));
  assert.ok(isValidCanonicalNodeId('CSAT.DATA'));
  assert.ok(isValidCanonicalNodeId('ESSAY.PHIL'));
  assert.ok(isValidCanonicalNodeId('ESSAY.SOC'));
  assert.ok(isValidCanonicalNodeId('ESSAY.ENV'));
});

test('every study resource in STUDY_RESOURCES has a reviewed canonical mapping entry', () => {
  assert.equal(STUDY_RESOURCES.length, 52);
  for (const resource of STUDY_RESOURCES) {
    const entry = STUDY_RESOURCE_MAPPINGS[resource.id];
    assert.ok(entry, `Resource '${resource.id}' must have an entry in STUDY_RESOURCE_MAPPINGS`);
    assert.equal(entry.resourceId, resource.id);
    assert.equal(entry.reviewerStatus, 'reviewed');
    assert.ok(entry.mappings.length > 0, `Resource '${resource.id}' must have at least one mapping`);

    for (const mapping of entry.mappings) {
      assert.ok(
        isValidCanonicalNodeId(mapping.nodeId),
        `Mapping for '${resource.id}' references unknown node '${mapping.nodeId}'`
      );
      assert.ok(
        ['primary', 'secondary', 'cross_paper', 'prerequisite'].includes(mapping.relationType),
        `Mapping for '${resource.id}' has invalid relationType '${mapping.relationType}'`
      );
      assert.ok(mapping.mappingBasis.length > 10, `Mapping for '${resource.id}' must provide descriptive basis`);
    }
  }
});

test('all legacy tag aliases resolve to valid canonical syllabus nodes', () => {
  const legacyEntries = Object.entries(LEGACY_TAG_TO_CANONICAL);
  assert.ok(legacyEntries.length >= 8);

  for (const [legacyTag, canonicalIds] of legacyEntries) {
    assert.ok(canonicalIds.length > 0, `Legacy tag '${legacyTag}' must map to at least one canonical node`);
    for (const id of canonicalIds) {
      assert.ok(
        isValidCanonicalNodeId(id),
        `Legacy tag '${legacyTag}' maps to '${id}', which is not in CANONICAL_NODE_IDS`
      );
    }
  }
});

test('the 8 identified study note tag discrepancies resolve strictly to canonical nodes', () => {
  // 1. GS2 Institutions -> GS2.POL.CONST_BODIES + GS2.POL.NON_CONST
  assert.deepEqual(resolveLegacyTagToCanonical('GS2.POL.INSTITUTIONS'), [
    'GS2.POL.CONST_BODIES',
    'GS2.POL.NON_CONST',
  ]);

  // 2. GS1 Philosophy -> GS1.CUL.LIT_PHIL + GS4.ETH.THINKERS
  assert.deepEqual(resolveLegacyTagToCanonical('GS1.CUL.PHILOSOPHY'), [
    'GS1.CUL.LIT_PHIL',
    'GS4.ETH.THINKERS',
  ]);

  // 3. GS3 Money Bank -> GS3.ECO.MONETARY + GS3.ECO.BANKING
  assert.deepEqual(resolveLegacyTagToCanonical('GS3.ECO.MONEY_BANK'), [
    'GS3.ECO.MONETARY',
    'GS3.ECO.BANKING',
  ]);

  // 4. GS3 External Sector -> GS3.ECO.EXTERNAL
  assert.deepEqual(resolveLegacyTagToCanonical('GS3.ECO.EXTERNAL_SECTOR'), [
    'GS3.ECO.EXTERNAL',
  ]);

  // 5. GS4 Dimensions -> GS4.ETH.INTERFACE
  assert.deepEqual(resolveLegacyTagToCanonical('GS4.ETH.DIMENSIONS'), [
    'GS4.ETH.INTERFACE',
  ]);

  // 6. CSAT Reasoning -> CSAT.RC
  assert.deepEqual(resolveLegacyTagToCanonical('CSAT.REASONING'), [
    'CSAT.RC',
  ]);

  // 7. GS3 Environment Conservation -> GS3.ENV.WETLANDS
  assert.deepEqual(resolveLegacyTagToCanonical('GS3.ENV.CONSERVATION'), [
    'GS3.ENV.WETLANDS',
  ]);

  // 8. GS3 Environment Protected -> GS3.ENV.BIODIVERSITY
  assert.deepEqual(resolveLegacyTagToCanonical('GS3.ENV.PROTECTED'), [
    'GS3.ENV.BIODIVERSITY',
  ]);
});

test('canonical tags resolve directly to themselves', () => {
  assert.deepEqual(resolveLegacyTagToCanonical('GS2.POL.CONSTITUTION'), ['GS2.POL.CONSTITUTION']);
  assert.deepEqual(resolveLegacyTagToCanonical('GS1.HIS.FREEDOM'), ['GS1.HIS.FREEDOM']);
  assert.deepEqual(resolveLegacyTagToCanonical('NON_EXISTENT_TAG_XYZ'), []);
});

test('reverse lookup retrieves all linked resources for a canonical node', () => {
  const constitutionResources = getResourcesForCanonicalNode('GS2.POL.CONSTITUTION');
  assert.ok(constitutionResources.length >= 3, 'GS2.POL.CONSTITUTION should have multiple mapped resources');
  const resIds = constitutionResources.map((r) => r.resourceId);
  assert.ok(resIds.includes('gs2-polity:note:GS2.POL.CONSTITUTION'));
  assert.ok(resIds.includes('gs2-polity:map:mm-amendment'));
  assert.ok(resIds.includes('static-gk-vault:reference:stat-const-amendments'));

  // Wildlife biodiversity node reverse lookup
  const bioResources = getResourcesForCanonicalNode('GS3.ENV.BIODIVERSITY');
  assert.ok(bioResources.length >= 2);
  const bioResIds = bioResources.map((r) => r.resourceId);
  assert.ok(bioResIds.includes('static-gk-vault:note:GS3.ENV.PROTECTED'));
  assert.ok(bioResIds.includes('static-gk-vault:reference:stat-biosphere-reserves'));
});

test('GS2.POL.CONSTITUTION is not used as a blanket fallback for unrelated resources', () => {
  const constitutionResources = getResourcesForCanonicalNode('GS2.POL.CONSTITUTION');
  for (const { resourceId } of constitutionResources) {
    const res = STUDY_RESOURCES.find((r) => r.id === resourceId);
    assert.ok(res, `Resource '${resourceId}' must exist`);
    // Ensure no geography, economy, or ethics items are wrongly attributed to Constitution
    assert.ok(
      res.subjectId === 'gs2-polity' || res.id === 'static-gk-vault:reference:stat-const-amendments',
      `Resource '${resourceId}' should not be mapped to GS2.POL.CONSTITUTION`
    );
  }
});
