# Dual-Classifier Pilot Report (WS-1.1 Attribution Gate)

**Generated:** 2026-08-23T14:03:46.603Z
**Evaluation Model:** Gemini `gemini-embedding-001` (768-dim, `SEMANTIC_SIMILARITY`) vs Deterministic Keyword Overlap
**Evaluation Objective:** Establish baseline agreement between Rater A (Embedding-Cosine Gate, `threshold = 0.5`) and Rater B (Keyword/Entity Classifier) on 50 live current affairs claims.

## Summary Metrics

- **Total Sampled Claims:** 50
- **Agreed Attributions:** 13 (26%)
  - _Concordant Syllabus Node Matches:_ 13
  - _Concordant Rejections (Both Out-of-Syllabus):_ 0
- **Disagreed Attributions (Human Review Queue):** 37 (74.0%)

## Methodology

- **Rater A (Semantic Embedding Gate):** Embeds claim text via Gemini `gemini-embedding-001` at 768-dim and computes cosine similarity against all ~130 `SyllabusNode` embeddings (`threshold = 0.5`).
- **Rater B (Keyword/Entity Overlap):** Matches curated `SyllabusNode.entities` and tokenized `gloss` against claim text using deterministic substring/token overlap.
- **Agreement Definition:** Both raters assign the exact same top `nodeId`, or both raters reject the claim as unmapped/out-of-syllabus.

## Concordant Matches Sample

| # | Headline | Agreed Node | Rater A Cosine | Rater B Score | Matched Entities |
|---|---|---|---|---|---|
| 1 | लोकायन 2026 – आईएनएस सुदर्शनी लिस्बन, पुर्तगाल पहु | `GS2.IR` | 0.806 | 5.75 | bilateral, diaspora |
| 2 | स्पेस स्टार्टअप के CEOs के साथ प्रधानमंत्री की बात | `GS3.SCI.SPACE` | 0.852 | 0.75 | - |
| 3 | Rajya Sabha discusses the working of the Ministry  | `GS3.ENV.FORESTS` | 0.82 | 4.9 | State of Forest Report |
| 4 | केंद्रीय गृह मंत्री श्री अमित शाह ने आज सिलीगुड़ी  | `GS3.SEC.FORCES` | 0.82 | 2.8 | BSF |
| 5 | The Tribunal Rules, 2021 contradict the Supreme Co | `GS2.POL.JUDICIARY` | 0.837 | 6.85 | Supreme Court, Tribunals |
| 6 | Understanding vacancies in the Indian judiciary | `GS2.POL.JUDICIARY` | 0.88 | 4.05 | Supreme Court |
| 7 | CAG Observations on Uttar Pradesh Finances in 2020 | `GS3.ECO.FISCAL` | 0.786 | 3.6 | Revenue deficit |
| 8 | प्रधानमंत्री ने 'इकोनॉमिक टाइम्स वर्ल्ड लीडर्स फोर | `GS3.ECO.GROWTH` | 0.8 | 3 | Job creation |
| 9 | इकोनॉमिक टाइम्स वर्ल्ड लीडर्स फोरम 2026 में प्रधान | `GS2.GOV` | 0.816 | 2.95 | governance |
| 10 | Explained: Role of Governor in Public Universities | `GS2.POL.UNION_EXEC` | 0.835 | 3.7 | Governor |
| 11 | Inflation targets not met – MPC to examine today | `GS3.ECO.MONETARY` | 0.861 | 3.75 | Repo rate |
| 12 | Result of the Second Overnight Variable Rate Rever | `GS3.ECO.MONETARY` | 0.797 | 4.3 | RBI, Repo rate |
| 13 | First no-confidence motion of the 17th Lok Sabha d | `GS2.POL.PARLIAMENT` | 0.848 | 3 | Lok Sabha |

## Disagreement Adjudication Queue (N = 37)

| # | Claim Headline / Summary Snippet | Rater A (Embedding) Top Node [Cosine] | Rater B (Keyword) Top Node [Score / Matches] |
|---|---|---|---|
| 1 | वाणिज्य और उद्योग मंत्री श्री पीयूष गोयल 200 सदस्यीय व्यापारिक प्रतिनिधिमंडल का नेतृत्व करते हुए जापान के लिए रवाना हुए.... | `GS2.IR.BILATERAL` (0.809) | _None / No Entity Match_ |
| 2 | डॉ. मनसुख मांडव‍िया, श्रीमती रक्षा खडसे ने विशाखापत्तनम में ब्रिक्स मैत्री साइकिलिंग कार्यक्रम का नेतृत्व किया. Cycling ... | `GS2.SOCJ.HEALTH` (0.777) | `GS3.ENV` (2.65) [pollution] |
| 3 | कर्मचारी भविष्य निधि संगठन (ईपीएफओ) ने प्रतिष्ठानों से ईपीएफ कवरेज से बाहर कर्मचारियों के लिए सामाजिक सुरक्षा सुनिश्चित ... | `GS2.SOCJ.SCHEMES` (0.799) | _None / No Entity Match_ |
| 4 | महेश्वरी समाज की सेवा, त्याग और सामाजिक प्रतिबद्धता की गौरवशाली एवं प्रेरणादायी विरासत रही है : लोक सभा अध्यक्ष. The Mah... | `GS4.ETH.VALUES` (0.82) | `GS2.SOCJ` (2.95) [education] |
| 5 | Impact of COVID-19 on employment in urban areas. About 90% of workers are informal; the Standing Committee on Labour rec... | `GS3.ECO.GROWTH` (0.826) | `GS3.ECO` (2.65) [infrastructure] |
| 6 | RBI imposes monetary penalty on Progfin Private Limited. The penalty was levied under sections 58(G)(1)(b) and 58(B)(5)(... | `GS3.ECO.BANKING` (0.815) | `GS3.ECO.MONETARY` (2.65) [RBI] |
| 7 | विशाखापत्तनम में ब्रिक्स के युवा कार्य मंत्रियों की बैठक संपन्न; संयुक्त वक्तव्य अपनाया गया. The meeting was chaired by ... | `GS2.IR.WEST_ASIA` (0.785) | `GS3.ENV` (2.5) [environment] |
| 8 | Auction of 91-Day, 182-Day and 364-Day Treasury Bills. The auction will use a multiple‑price method; if the electronic s... | `GS3.AGRI.PDS` (0.796) | `GS3.ECO.FISCAL` (3.3) [Public debt] |
| 9 | RBI imposes monetary penalty on Shri Ram Finance Corporation Private Limited. The penalty was levied under section 58G(1... | `GS3.ECO.BANKING` (0.814) | `GS3.ECO.MONETARY` (2.65) [RBI] |
| 10 | Assam’s new cattle preservation law. The Assam Legislative Assembly passed the Assam Cattle Preservation Bill, 2021, whi... | `GS3.AGRI.ALLIED` (0.791) | _None / No Entity Match_ |
| 11 | डीएफएस ने दिव्यांगजनों हेतु वित्तीय सेवाओं की पहुंच बेहतर करने पर आयोजित दो दिवसीय कार्यशाला पूरी की. The second‑day dis... | `GS2.SOCJ.SCHEMES` (0.812) | _None / No Entity Match_ |
| 12 | कोच्चि स्थित सीएसएल द्वारा निर्मित तीसरी पनडुब्बी रोधी उथले जल की नौका, मैंग्रोल नौसेना को सुपुर्द. Powered by a water‑j... | `GS3.SCI.DEFENCE` (0.84) | _None / No Entity Match_ |
| 13 | राष्ट्रीय जैव विविधता प्राधिकरण (एनबीए) ने पहुंच और लाभ-साझाकरण (एबीएस) निधि से 27 राज्य जैव विविधता बोर्डों, 3 केंद्र श... | `GS3.ENV.GOVERNANCE` (0.825) | `GS3.ENV` (2.65) [biodiversity] |
| 14 | सरकार ने चार वर्ष से कम आयु के बच्चों में उपयोग के लिए क्लोरफेनिरामाइन मैलिएट और फिनाइलेफ्राइन हाइड्रोक्लोराइड युक्त निश... | `GS3.SCI.IPR` (0.759) | _None / No Entity Match_ |
| 15 | Data on Forex inflows via FCNR(B) Deposits, External Commercial Borrowings (ECBs) and Overseas Foreign Currency Borrowin... | `GS3.ECO.EXTERNAL` (0.834) | `GS3.ECO.MONETARY` (2.95) [RBI] |
| 16 | Auction of State Government Securities. The securities will be eligible for banks’ Statutory Liquidity Ratio (SLR) under... | `GS3.ECO.MONETARY` (0.833) | `GS3.ECO` (2.65) [banking] |
| 17 | केन्द्रीय गृह एवं सहकारिता मंत्री श्री अमित शाह ने आज पश्चिम बंगाल के सिलिगुड़ी में तीन नए कानूनों पर प्रदर्शनी का उद्घा... | `GS3.SEC.BORDER` (0.818) | `GS3.AGRI.LAND` (0.75) [] |
| 18 | प्रधानमंत्री ने अंतरिक्ष स्टार्टअप्स के मुख्‍य कार्यकारी अधिकारियों और संस्थापकों के साथ संवाद किया. Prime Minister Nare... | `GS2.IR.MULTILATERAL` (0.813) | `GS3.ENV` (2.5) [environment] |
| 19 | 624<sup>th</sup> Meeting of Central Board of the Reserve Bank of India. The Board reviewed the current economic situatio... | `GS3.ECO.MONETARY` (0.827) | `PRE.STAT.REPORTS` (0.9) [] |
| 20 | Sovereign Gold Bond (SGB) Scheme Calendar for premature redemption during October 2026 – March 2027. Investors are advis... | `GS3.ECO.CAPITAL_MKT` (0.782) | _None / No Entity Match_ |
| 21 | State of the Civil Aviation Sector in India. The sector suffered severe Covid‑19‑induced losses – airlines lost over Rs ... | `GS3.AGRI.PDS` (0.799) | _None / No Entity Match_ |
| 22 | केंद्रीय वित्त राज्य मंत्री श्री पंकज चौधरी ने आज नई दिल्ली में आयोजित सिक्योरिटी प्रिंटिंग एंड मिंटिंग कॉरपोरेशन ऑफ इंड... | `GS2.GOV.E_GOV` (0.805) | `GS2.GOV` (2.8) [governance] |
| 23 | केंद्रीय संचार मंत्री श्री ज्योतिरादित्य सिंधिया ने पुणे में आयोजित डिजिटल ब्रिक्स फोरम और एक्स्पो में प्रतिनिधिमंडलों क... | `GS2.GOV.E_GOV` (0.807) | `GS4.PROB.CITIZEN_CHARTER` (3.45) [Grievance redressal] |
| 24 | प्रधानमंत्री ने भारत की ब्रिक्स अध्यक्षता और सतत विकास पर एक लेख साझा किया. It also highlights India’s progress in reduc... | `GS2.IR.MULTILATERAL` (0.846) | _None / No Entity Match_ |
| 25 | नवगठित राष्ट्रीय अल्पसंख्यक आयोग ने वर्ष 2026 की अपनी पहली बैठक में अल्पसंख्यक समुदायों के कल्याण और सुरक्षा उपायों की स... | `GS2.SOCJ.SCHEMES` (0.825) | `GS2.POL.NON_CONST` (0.75) [] |
| 26 | केंद्रीय मंत्री श्रीमती अन्नपूर्णा देवी ने कोलकाता में पश्चिम बंगाल में महिला एवं बाल विकास मंत्रालय की योजनाओं की समीक्... | `GS2.SOCJ.SCHEMES` (0.816) | `GS2.GOV` (2.65) [transparency] |
| 27 | ब्रिक्स युवा परिषद और ब्रिक्स युवा शिखर सम्मेलन 2026: दूसरे दिन युवा प्रतिनिधियों ने स्टैच्यू ऑफ यूनिटी का दौरा किया. Th... | `GS2.IR.MULTILATERAL` (0.789) | `GS3.DIS` (2.65) [resilience] |
| 28 | केंद्रीय गृह एवं सहकारिता मंत्री श्री अमित शाह ने केंद्रीय मंत्रिमंडल द्वारा जम्मू-कश्मीर और लद्दाख उच्च न्यायालय की पीठ... | `GS3.SEC.INTERNAL` (0.794) | _None / No Entity Match_ |
| 29 | Seven years of Swachh Bharat Mission. Swachh Bharat Mission was launched on 2 Oct 2014 with the vision of a clean India ... | `GS3.ENV.POLLUTION` (0.822) | `GS3.SCI.IT_COMP` (0.75) [] |
| 30 | Explained: Karnataka’s Ordinance on religious conversion. Karnataka Protection of Right to Freedom of Religion Ordinance... | `GS2.POL.ELECTIONS` (0.817) | `GS2.POL.UNION_EXEC` (2.65) [Ordinance] |
| 31 | Explained: Draft amendments to the IT Rules 2021. On 6 June 2022, the Ministry of Electronics and Information Technology... | `GS4.PROB.CITIZEN_CHARTER` (0.815) | `GS4.ETH` (2.65) [ethics] |
| 32 | Lok Sabha passes a Bill to regulate doping in sports. The National Anti‑Doping Bill, 2021, passed by Lok Sabha, makes th... | `GS2.POL.ELECTIONS` (0.816) | `GS2.POL.PARLIAMENT` (3.15) [Lok Sabha] |
| 33 | How India will elect its next President. The President is elected by an electoral college of elected MPs and MLAs of the... | `GS2.POL.UNION_EXEC` (0.824) | `GS2.POL` (2.65) [Constitution] |
| 34 | स्टील अथॉरिटी ऑफ इण्डिया लिमिटेड (SAIL) ने एमएमडीआर संशोधन अधिनियम, 2026 का किया स्वागत, बताया खनिज सुरक्षा और घरेलू लौह... | `GS3.ECO.TAXATION` (0.79) | _None / No Entity Match_ |
| 35 | How long can the central government take to frame Rules?. Ordinarily, Rules, Regulations and bye‑laws must be framed wit... | `GS3.ECO.FISCAL` (0.79) | _None / No Entity Match_ |
| 36 | Anti-cheating laws for competitive examinations. Over the past few years, states such as Uttarakhand, Gujarat, Rajasthan... | `GS2.POL.ELECTIONS` (0.831) | `GS4.ETH.FOUNDATIONAL` (2.95) [Integrity] |
| 37 | What is Fuelling Power Sector Losses?. State‑owned power distribution companies incurred Rs 68,832 crore losses in 2022‑... | `GS3.AGRI.PDS` (0.798) | `PRE.STAT.REPORTS` (0.6) [] |
