-- ==============================================================================
-- Seed Fixture: Anonymised Core Content & Question Sample (WS-0.4)
-- Contains non-PII sample rows for static_questions, current_affairs, saved_articles
-- ==============================================================================

-- 1. Sample Current Affairs Items
INSERT INTO public.current_affairs (id, source, ministry, headline, summary, url, published_at)
VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'PIB',
    'Ministry of Environment, Forest and Climate Change',
    'India Adds New Wetland to Ramsar List Ahead of World Wetlands Day',
    '{"bullets": ["New high-altitude wetland in Ladakh designated as Ramsar site.", "Takes total Ramsar sites count in India to 85.", "Highlights national commitment to wetland conservation."]}'::jsonb,
    'https://pib.gov.in/PressReleasePage.aspx?PRID=1000001',
    NOW() - INTERVAL '2 days'
),
(
    '00000000-0000-0000-0000-000000000002',
    'PIB',
    'Ministry of Science & Technology',
    'ISRO Successfully Validates Space Docking Experiment (SPADEX)',
    '{"bullets": ["Autonomous docking system validated in low Earth orbit.", "Crucial technology milestone for Bharatiya Antariksh Station (BAS).", "Precision relative navigation algorithms demonstrated successfully."]}'::jsonb,
    'https://pib.gov.in/PressReleasePage.aspx?PRID=1000002',
    NOW() - INTERVAL '1 day'
)
ON CONFLICT (url) DO NOTHING;

-- 2. Sample Static Questions
INSERT INTO public.static_questions (
    id,
    question_text,
    options_matrix,
    correct_option,
    exam_origin_tag,
    subject_category,
    difficulty_level,
    conceptual_explanation,
    is_generated
)
VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'With reference to the Constitution of India, which of the following is correct regarding the writ of Quo-Warranto?',
    '{"A": "It can be sought only by an aggrieved person whose fundamental right is infringed.", "B": "It is issued by the court to enquire into the legality of the claim of a person to a public office.", "C": "It can be issued against private bodies or individuals holding informal positions.", "D": "It is an administrative remedy available exclusively against ministerial decisions."}'::jsonb,
    'B',
    'UPSC CSE Prelims 2022',
    'Polity',
    'intermediate',
    'Quo-Warranto is issued by the court to enquire into the legality of the claim of a person to a public office. Unlike other writs, it can be sought by any interested person, not necessarily the aggrieved party.',
    false
),
(
    '10000000-0000-0000-0000-000000000002',
    'Consider the following statements regarding the Fujiwhara Effect in meteorology:\n1. It refers to the binary interaction between two cyclones spinning in the same direction.\n2. It occurs only when the distance between cyclone centers is less than 100 km.\nWhich of the statements given above is/are correct?',
    '{"A": "1 only", "B": "2 only", "C": "Both 1 and 2", "D": "Neither 1 nor 2"}'::jsonb,
    'A',
    'UPSC CSE Mains 2026 Theme / Model',
    'Geography',
    'tough',
    'Statement 1 is correct: The Fujiwhara effect describes the binary aerodynamic interaction between two concurrent cyclonic vortices spinning in the same direction. Statement 2 is incorrect: Interaction begins at distances up to ~1,400 km, while complete merger occurs typically below ~300 km.',
    false
)
ON CONFLICT (id) DO NOTHING;
