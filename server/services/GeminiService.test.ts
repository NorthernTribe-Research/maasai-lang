import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Set environment variable before importing GeminiService
process.env.GEMINI_API_KEY = 'test-api-key';

import { GeminiService } from './GeminiService';

describe('GeminiService - Enhanced Cultural Content', () => {
  let geminiService: GeminiService;

  beforeEach(() => {
    geminiService = new GeminiService();
  });

  it('should generate cultural content with customs, traditions, and etiquette', async () => {
    // Mock the generateContent method
    const mockResponse = JSON.stringify({
      title: 'Greetings in Spanish',
      content: 'Spanish greetings vary by region and formality level...',
      customs: [
        'In Spain, people greet with two kisses on the cheek',
        'In Latin America, a handshake is more common for first meetings',
        'Family gatherings often involve warm embraces',
        'Morning greetings are important in Spanish culture'
      ],
      traditions: [
        'The siesta tradition affects greeting times',
        'Religious holidays have specific greeting customs',
        'Regional festivals have unique greeting rituals'
      ],
      etiquette: [
        'Always greet elders first as a sign of respect',
        'Use formal "usted" with strangers and authority figures',
        'Maintain eye contact during greetings',
        'Avoid being too loud in formal settings'
      ],
      practicalTips: [
        'Learn regional variations before traveling',
        'Practice pronunciation of formal vs informal greetings',
        'Observe locals to understand appropriate physical contact',
        'When in doubt, err on the side of formality'
      ],
      commonMistakes: [
        'Using "tú" with elders or authority figures',
        'Forgetting to greet everyone in a group individually'
      ],
      regionalVariations: 'Spain uses "vosotros" while Latin America uses "ustedes" for plural you',
      relevance: 'Understanding greeting customs helps build rapport and avoid cultural misunderstandings'
    });

    vi.spyOn(geminiService, 'generateContent').mockResolvedValue(mockResponse);

    const result = await geminiService.generateCulturalContent('Spanish', 'Greetings', 'Beginner');

    expect(result).toBeDefined();
    expect(result.customs).toHaveLength(4);
    expect(result.traditions).toHaveLength(3);
    expect(result.etiquette).toHaveLength(4);
    expect(result.practicalTips).toHaveLength(4);
    expect(result.commonMistakes).toHaveLength(2);
    expect(result.regionalVariations).toBeDefined();
  });

  it('should generate curriculum with cultural notes in vocabulary', async () => {
    const mockResponse = JSON.stringify({
      curriculum: {
        targetLanguage: 'Spanish',
        proficiencyLevel: 'Beginner',
        lessons: [
          {
            title: 'Basic Greetings',
            description: 'Learn how to greet people in Spanish',
            orderIndex: 0,
            estimatedDuration: 30,
            vocabulary: [
              {
                word: 'hola',
                translation: 'hello',
                pronunciation: 'OH-lah',
                partOfSpeech: 'interjection',
                exampleSentences: ['Hola, ¿cómo estás?'],
                culturalNote: 'Used in all contexts, but in formal settings consider adding "buenos días" or "buenas tardes". In Spain, often accompanied by two kisses on the cheek among friends.'
              }
            ],
            grammar: [
              {
                topic: 'Formal vs Informal You',
                explanation: 'Spanish has different forms for addressing people',
                examples: ['Tú eres mi amigo', 'Usted es mi profesor'],
                rules: ['Use tú with friends', 'Use usted with elders'],
                culturalUsage: 'The choice between tú and usted reflects social hierarchy and respect. In Latin America, usted is used more frequently than in Spain. Always use usted with people older than you, authority figures, or in professional settings until invited to use tú.'
              }
            ],
            culturalContent: [
              {
                topic: 'Spanish Greeting Customs',
                content: 'Greetings in Spanish-speaking countries vary significantly...',
                customs: ['Two kisses in Spain', 'Handshake in Latin America', 'Warm embraces with family', 'Morning greetings are essential'],
                traditions: ['Siesta affects greeting times', 'Religious holiday greetings', 'Festival greeting rituals'],
                etiquette: ['Greet elders first', 'Use formal address with strangers', 'Maintain eye contact', 'Avoid loud voices in formal settings'],
                practicalTips: ['Learn regional variations', 'Practice formal vs informal', 'Observe locals', 'When in doubt, be formal'],
                commonMistakes: ['Using tú with elders', 'Not greeting everyone individually'],
                regionalVariations: 'Spain uses vosotros, Latin America uses ustedes',
                relevance: 'Proper greetings build rapport and show cultural awareness'
              }
            ]
          }
        ]
      }
    });

    vi.spyOn(geminiService, 'generateContent').mockResolvedValue(mockResponse);

    const result = await geminiService.generateCurriculum({
      targetLanguage: 'Spanish',
      nativeLanguage: 'English',
      proficiencyLevel: 'Beginner'
    });

    expect(result.curriculum.lessons[0].vocabulary[0].culturalNote).toBeDefined();
    expect(result.curriculum.lessons[0].vocabulary[0].culturalNote).toContain('formal');
    expect(result.curriculum.lessons[0].grammar[0].culturalUsage).toBeDefined();
    expect(result.curriculum.lessons[0].grammar[0].culturalUsage).toContain('social hierarchy');
    expect(result.curriculum.lessons[0].culturalContent[0].customs).toHaveLength(4);
    expect(result.curriculum.lessons[0].culturalContent[0].etiquette).toHaveLength(4);
  });

  it('should generate tutor explanations with cultural context', async () => {
    const mockResponse = JSON.stringify({
      explanation: 'The word "tú" is the informal form of "you" in Spanish, used with friends and family. However, cultural context is crucial...',
      examples: ['Tú eres mi amigo (You are my friend)', 'Tú hablas español (You speak Spanish)'],
      culturalNotes: [
        'In Spain, tú is used more liberally than in Latin America',
        'Using tú with elders can be seen as disrespectful',
        'In professional settings, always start with usted',
        'Young people may invite you to use tú by saying "tutéame"'
      ],
      etiquetteRules: [
        'Always use usted with people older than you until invited to use tú',
        'In business meetings, use usted unless the other person suggests otherwise'
      ],
      commonMistakes: [
        'Foreigners often use tú too quickly with strangers',
        'Not recognizing regional differences in formality expectations'
      ],
      relatedConcepts: ['usted', 'vosotros', 'ustedes'],
      practiceExercises: ['Practice introducing yourself formally and informally']
    });

    vi.spyOn(geminiService, 'generateContent').mockResolvedValue(mockResponse);

    const result = await geminiService.explainConcept({
      question: 'When should I use tú vs usted?',
      context: {},
      proficiencyLevel: 'Beginner'
    });

    expect(result.culturalNotes).toBeDefined();
    expect(result.culturalNotes).toHaveLength(4);
    expect(result.etiquetteRules).toBeDefined();
    expect(result.etiquetteRules).toHaveLength(2);
    expect(result.commonMistakes).toBeDefined();
    expect(result.commonMistakes).toHaveLength(2);
  });
});

describe('GeminiService - Cultural Content in Lessons', () => {
  let geminiService: GeminiService;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-api-key';
    geminiService = new GeminiService();
  });

  /**
   * Test: Cultural content is properly included in generated lessons
   * Requirements: 16.1, 16.3
   */
  it('should include comprehensive cultural content in generated lessons', async () => {
    const mockResponse = JSON.stringify({
      lesson: {
        title: 'Family and Relationships',
        description: 'Learn vocabulary and customs related to family',
        proficiencyLevel: 'Intermediate',
        estimatedDuration: 45,
        vocabulary: [
          {
            word: 'familia',
            translation: 'family',
            pronunciation: 'fah-MEE-lee-ah',
            partOfSpeech: 'noun',
            exampleSentences: ['Mi familia es muy grande', 'La familia es importante'],
            culturalNote: 'Family is central to Spanish culture. Extended family gatherings are common, especially on Sundays. The concept of family extends beyond immediate relatives to include godparents (padrinos) and close family friends.'
          },
          {
            word: 'abuelo',
            translation: 'grandfather',
            pronunciation: 'ah-BWEH-loh',
            partOfSpeech: 'noun',
            exampleSentences: ['Mi abuelo tiene 80 años'],
            culturalNote: 'Elders are highly respected in Spanish culture. It is customary to greet grandparents with a kiss and show deference in conversation. Many families live in multi-generational households.'
          }
        ],
        grammar: [
          {
            topic: 'Possessive Adjectives',
            explanation: 'Possessive adjectives show ownership',
            examples: ['mi familia (my family)', 'tu hermano (your brother)'],
            rules: ['Possessive adjectives agree in number with the noun'],
            culturalUsage: 'When talking about family, Spanish speakers often use possessive adjectives more frequently than in English. Saying "mi madre" instead of just "madre" shows affection and closeness. In formal contexts, you might hear "su familia" (your family) when using usted.'
          }
        ],
        culturalContent: [
          {
            topic: 'Family Values in Spanish Culture',
            content: 'Family is the cornerstone of Spanish and Latin American societies. Extended family members play active roles in daily life, and family gatherings are frequent and important social events.',
            customs: [
              'Sunday family meals are a sacred tradition in many Spanish-speaking countries',
              'Godparents (padrinos) have significant responsibilities and are considered part of the family',
              'Children often live with parents until marriage, even into their 30s',
              'Family celebrations include extended relatives, sometimes 50+ people'
            ],
            traditions: [
              'Quinceañera celebrations mark a girl\'s 15th birthday with elaborate parties',
              'Name days (santo) are celebrated alongside birthdays',
              'Family reunions during Christmas and Easter are major events'
            ],
            etiquette: [
              'Always greet each family member individually when arriving',
              'Show extra respect to elders by greeting them first',
              'It is polite to bring a small gift when invited to a family meal',
              'Avoid discussing family problems with outsiders - family matters stay private'
            ],
            practicalTips: [
              'If invited to a family gathering, expect to stay for several hours',
              'Learn the names of extended family members - it shows respect',
              'Don\'t be surprised by physical affection like hugs and kisses',
              'Family comes before work in most Spanish cultures - understand this priority'
            ],
            commonMistakes: [
              'Declining family invitations can be seen as offensive',
              'Not showing proper respect to elders'
            ],
            regionalVariations: 'In Spain, families tend to be smaller and more nuclear, while in Latin America, extended family involvement is more pronounced',
            relevance: 'Understanding family dynamics is crucial for building relationships and navigating social situations in Spanish-speaking countries'
          }
        ]
      }
    });

    vi.spyOn(geminiService, 'generateContent').mockResolvedValue(mockResponse);

    const result = await geminiService.generateLesson({
      topic: 'Family and Relationships',
      proficiencyLevel: 'Intermediate',
      targetLanguage: 'Spanish',
      nativeLanguage: 'English'
    });

    // Verify lesson structure
    expect(result.lesson).toBeDefined();
    expect(result.lesson.title).toBe('Family and Relationships');
    
    // Verify vocabulary has cultural notes
    expect(result.lesson.vocabulary).toHaveLength(2);
    expect(result.lesson.vocabulary[0].culturalNote).toBeDefined();
    expect(result.lesson.vocabulary[0].culturalNote).toContain('Family is central');
    expect(result.lesson.vocabulary[1].culturalNote).toContain('Elders are highly respected');
    
    // Verify grammar has cultural usage
    expect(result.lesson.grammar).toHaveLength(1);
    expect(result.lesson.grammar[0].culturalUsage).toBeDefined();
    expect(result.lesson.grammar[0].culturalUsage).toContain('affection and closeness');
    
    // Verify cultural content sections
    expect(result.lesson.culturalContent).toHaveLength(1);
    const cultural = result.lesson.culturalContent[0];
    expect(cultural.customs).toHaveLength(4);
    expect(cultural.traditions).toHaveLength(3);
    expect(cultural.etiquette).toHaveLength(4);
    expect(cultural.practicalTips).toHaveLength(4);
    expect(cultural.commonMistakes).toHaveLength(2);
    expect(cultural.regionalVariations).toBeDefined();
  });

  /**
   * Test: All cultural fields are present and populated
   * Requirements: 16.1, 16.2, 16.5
   */
  it('should include all required cultural fields in lesson content', async () => {
    const mockResponse = JSON.stringify({
      lesson: {
        title: 'Business Etiquette',
        description: 'Professional communication in Spanish',
        proficiencyLevel: 'Advanced',
        estimatedDuration: 60,
        vocabulary: [
          {
            word: 'reunión',
            translation: 'meeting',
            pronunciation: 'reh-oo-NYON',
            partOfSpeech: 'noun',
            exampleSentences: ['Tenemos una reunión a las 10'],
            culturalNote: 'Business meetings in Spanish culture often start with personal conversation before discussing business. Punctuality expectations vary by region - stricter in Spain, more flexible in Latin America.'
          }
        ],
        grammar: [
          {
            topic: 'Formal Commands',
            explanation: 'Commands in professional settings',
            examples: ['Por favor, envíe el informe'],
            rules: ['Use usted form for formal commands'],
            culturalUsage: 'In business contexts, formal commands with "por favor" are essential. Direct commands without softening language can seem rude. Spanish business culture values politeness and indirect communication.'
          }
        ],
        culturalContent: [
          {
            topic: 'Business Culture',
            content: 'Professional interactions in Spanish-speaking countries',
            customs: [
              'Business cards are exchanged at the beginning of meetings',
              'Lunch meetings are common and can last 2-3 hours',
              'Personal relationships are built before business deals',
              'Hierarchy is respected in business settings'
            ],
            traditions: [
              'Long lunch breaks (comida) are traditional in Spain',
              'Business dinners often extend late into the evening',
              'August is vacation month in Spain - business slows down'
            ],
            etiquette: [
              'Dress formally for business meetings',
              'Address people by title and last name initially',
              'Wait to be invited to use first names',
              'Avoid aggressive negotiation tactics'
            ],
            practicalTips: [
              'Build personal rapport before discussing business',
              'Be patient - decisions may take longer than expected',
              'Learn about regional business customs',
              'Follow up meetings with formal written communication'
            ],
            commonMistakes: [
              'Being too direct or aggressive in negotiations',
              'Rushing to business without personal conversation'
            ],
            regionalVariations: 'Spain has more formal business culture than Latin America, where personal relationships are even more important',
            relevance: 'Understanding business etiquette is crucial for professional success in Spanish-speaking markets'
          }
        ]
      }
    });

    vi.spyOn(geminiService, 'generateContent').mockResolvedValue(mockResponse);

    const result = await geminiService.generateLesson({
      topic: 'Business Etiquette',
      proficiencyLevel: 'Advanced',
      targetLanguage: 'Spanish',
      nativeLanguage: 'English'
    });

    const cultural = result.lesson.culturalContent[0];
    
    // Verify all cultural fields exist
    expect(cultural.topic).toBeDefined();
    expect(cultural.content).toBeDefined();
    expect(cultural.customs).toBeDefined();
    expect(cultural.traditions).toBeDefined();
    expect(cultural.etiquette).toBeDefined();
    expect(cultural.practicalTips).toBeDefined();
    expect(cultural.commonMistakes).toBeDefined();
    expect(cultural.regionalVariations).toBeDefined();
    expect(cultural.relevance).toBeDefined();
    
    // Verify minimum array lengths
    expect(cultural.customs.length).toBeGreaterThanOrEqual(4);
    expect(cultural.traditions.length).toBeGreaterThanOrEqual(3);
    expect(cultural.etiquette.length).toBeGreaterThanOrEqual(4);
    expect(cultural.practicalTips.length).toBeGreaterThanOrEqual(4);
    expect(cultural.commonMistakes.length).toBeGreaterThanOrEqual(2);
  });

  /**
   * Test: Cultural notes are included in vocabulary items
   * Requirements: 16.5
   */
  it('should include cultural notes for all vocabulary items', async () => {
    const mockResponse = JSON.stringify({
      lesson: {
        title: 'Food and Dining',
        description: 'Vocabulary and customs around meals',
        proficiencyLevel: 'Beginner',
        estimatedDuration: 30,
        vocabulary: [
          {
            word: 'comida',
            translation: 'meal/lunch',
            pronunciation: 'koh-MEE-dah',
            partOfSpeech: 'noun',
            exampleSentences: ['La comida es a las 2'],
            culturalNote: 'In Spain, "comida" refers to the main meal of the day, typically eaten between 2-4 PM. This is the largest meal, not dinner. Restaurants may close between lunch and dinner service.'
          },
          {
            word: 'sobremesa',
            translation: 'after-meal conversation',
            pronunciation: 'soh-breh-MEH-sah',
            partOfSpeech: 'noun',
            exampleSentences: ['Me gusta la sobremesa con mi familia'],
            culturalNote: 'A uniquely Spanish concept - the time spent talking at the table after finishing a meal. This can last an hour or more and is considered an important part of the dining experience. Rushing away after eating is considered rude.'
          },
          {
            word: 'propina',
            translation: 'tip',
            pronunciation: 'proh-PEE-nah',
            partOfSpeech: 'noun',
            exampleSentences: ['Dejé una propina de 10%'],
            culturalNote: 'Tipping culture varies significantly. In Spain, 5-10% is standard and not obligatory. In Latin America, 10-15% is more common. Service charge may be included in the bill.'
          }
        ],
        grammar: [
          {
            topic: 'Meal Times',
            explanation: 'Expressing time for meals',
            examples: ['Desayuno a las 8', 'Ceno a las 10'],
            rules: ['Use "a las" for specific times'],
            culturalUsage: 'Meal times in Spanish-speaking countries differ significantly from English-speaking countries. Dinner (cena) is typically eaten between 9-11 PM in Spain, much later than in the US or UK. Adjusting to this schedule is important for social integration.'
          }
        ],
        culturalContent: [
          {
            topic: 'Dining Customs',
            content: 'Meal traditions and etiquette',
            customs: [
              'Meals are social events, not just for eating',
              'The main meal is lunch, not dinner',
              'Tapas culture involves moving between bars',
              'Bread is eaten with every meal'
            ],
            traditions: [
              'Sunday family meals are sacred traditions',
              'Christmas Eve dinner (Nochebuena) is the main holiday meal',
              'Paella is traditionally eaten on Sundays'
            ],
            etiquette: [
              'Keep hands visible on the table, not in your lap',
              'Wait for the host to start eating',
              'Finish everything on your plate',
              'Don\'t ask for a to-go box - it\'s uncommon'
            ],
            practicalTips: [
              'Restaurants open late - dinner service starts around 9 PM',
              'Make reservations for popular restaurants',
              'Learn regional specialties before ordering',
              'Don\'t expect free water - ask for "agua del grifo"'
            ],
            commonMistakes: [
              'Eating dinner too early and finding restaurants closed',
              'Leaving immediately after eating without sobremesa'
            ],
            regionalVariations: 'Meal times vary by region - Latin America tends to eat earlier than Spain',
            relevance: 'Understanding dining customs helps you navigate social situations and avoid cultural faux pas'
          }
        ]
      }
    });

    vi.spyOn(geminiService, 'generateContent').mockResolvedValue(mockResponse);

    const result = await geminiService.generateLesson({
      topic: 'Food and Dining',
      proficiencyLevel: 'Beginner',
      targetLanguage: 'Spanish',
      nativeLanguage: 'English'
    });

    // Verify all vocabulary items have cultural notes
    expect(result.lesson.vocabulary).toHaveLength(3);
    result.lesson.vocabulary.forEach((item: any) => {
      expect(item.culturalNote).toBeDefined();
      expect(item.culturalNote.length).toBeGreaterThan(20); // Substantial content
    });
    
    // Verify cultural notes contain meaningful information
    expect(result.lesson.vocabulary[0].culturalNote).toContain('main meal');
    expect(result.lesson.vocabulary[1].culturalNote).toContain('uniquely Spanish');
    expect(result.lesson.vocabulary[2].culturalNote).toContain('Tipping culture');
  });

  /**
   * Test: Cultural usage is included in grammar sections
   * Requirements: 16.5
   */
  it('should include cultural usage in all grammar sections', async () => {
    const mockResponse = JSON.stringify({
      lesson: {
        title: 'Politeness and Formality',
        description: 'Formal and informal language',
        proficiencyLevel: 'Intermediate',
        estimatedDuration: 40,
        vocabulary: [
          {
            word: 'disculpe',
            translation: 'excuse me (formal)',
            pronunciation: 'dees-KOOL-peh',
            partOfSpeech: 'verb',
            exampleSentences: ['Disculpe, ¿dónde está el baño?'],
            culturalNote: 'Used in formal situations or with strangers. Shows respect and politeness. Essential for service interactions.'
          }
        ],
        grammar: [
          {
            topic: 'Formal vs Informal Address',
            explanation: 'Using tú vs usted',
            examples: ['¿Cómo estás? (informal)', '¿Cómo está usted? (formal)'],
            rules: ['Use tú with friends, family, children', 'Use usted with elders, strangers, authority figures'],
            culturalUsage: 'The tú/usted distinction is fundamental to Spanish social interaction. Using the wrong form can be offensive or create social awkwardness. In Spain, young people use tú more freely, but in Latin America, usted is more common even among peers. When in doubt, start with usted and wait to be invited to use tú.'
          },
          {
            topic: 'Subjunctive for Politeness',
            explanation: 'Using subjunctive to soften requests',
            examples: ['Quisiera un café (I would like a coffee)', 'Me gustaría hablar con usted (I would like to speak with you)'],
            rules: ['Subjunctive makes requests more polite', 'Common in service interactions'],
            culturalUsage: 'The subjunctive mood is essential for polite communication in Spanish. Direct requests can sound rude or demanding. Using "quisiera" instead of "quiero" shows cultural awareness and respect. This is especially important in restaurants, shops, and professional settings.'
          },
          {
            topic: 'Diminutives for Affection',
            explanation: 'Using -ito/-ita endings',
            examples: ['cafecito (little coffee)', 'momentito (just a moment)'],
            rules: ['Add -ito/-ita to nouns', 'Shows affection or minimizes requests'],
            culturalUsage: 'Diminutives are used extensively in Spanish to show affection, politeness, or to minimize the imposition of a request. "Un momentito" sounds much more polite than "un momento". This is particularly common in Latin America and shows warmth in communication.'
          }
        ],
        culturalContent: [
          {
            topic: 'Politeness in Spanish Culture',
            content: 'Understanding formality and respect',
            customs: [
              'Formal greetings are expected in professional settings',
              'Using titles (Señor, Señora, Don, Doña) shows respect',
              'Indirect communication is preferred over direct confrontation',
              'Politeness formulas are used extensively in daily interactions'
            ],
            traditions: [
              'Respect for elders is deeply ingrained',
              'Formal language is used in written communication',
              'Professional titles are used even in casual settings'
            ],
            etiquette: [
              'Always use usted with people you don\'t know well',
              'Add "por favor" and "gracias" liberally',
              'Avoid interrupting others in conversation',
              'Use formal greetings like "buenos días" instead of just "hola"'
            ],
            practicalTips: [
              'Listen to how locals address each other',
              'When someone invites you to use tú, accept graciously',
              'In business, maintain formality until relationships develop',
              'Written communication is typically more formal than spoken'
            ],
            commonMistakes: [
              'Using tú too quickly with older people or authority figures',
              'Being too direct in requests without softening language'
            ],
            regionalVariations: 'Spain is generally less formal than Latin America, especially among young people. Argentina uses "vos" instead of "tú" in informal contexts.',
            relevance: 'Mastering formality levels is crucial for social acceptance and avoiding offense in Spanish-speaking cultures'
          }
        ]
      }
    });

    vi.spyOn(geminiService, 'generateContent').mockResolvedValue(mockResponse);

    const result = await geminiService.generateLesson({
      topic: 'Politeness and Formality',
      proficiencyLevel: 'Intermediate',
      targetLanguage: 'Spanish',
      nativeLanguage: 'English'
    });

    // Verify all grammar sections have cultural usage
    expect(result.lesson.grammar).toHaveLength(3);
    result.lesson.grammar.forEach((item: any) => {
      expect(item.culturalUsage).toBeDefined();
      expect(item.culturalUsage.length).toBeGreaterThan(50); // Substantial content
    });
    
    // Verify cultural usage contains meaningful information
    expect(result.lesson.grammar[0].culturalUsage).toContain('fundamental to Spanish social interaction');
    expect(result.lesson.grammar[1].culturalUsage).toContain('essential for polite communication');
    expect(result.lesson.grammar[2].culturalUsage).toContain('show affection');
  });
});

describe('GeminiService - AI Tutor Cultural Context', () => {
  let geminiService: GeminiService;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-api-key';
    geminiService = new GeminiService();
  });

  /**
   * Test: AI tutor responses include cultural context when appropriate
   * Requirements: 16.3
   */
  it('should include cultural context in tutor responses about vocabulary', async () => {
    const mockResponse = JSON.stringify({
      explanation: 'The word "mañana" literally means "tomorrow" but has deeper cultural significance in Spanish-speaking countries. It represents a more relaxed attitude toward time and deadlines.',
      examples: [
        'Nos vemos mañana (See you tomorrow)',
        'Lo hago mañana (I\'ll do it tomorrow)'
      ],
      culturalNotes: [
        '"Mañana culture" refers to a more flexible approach to time in Spanish-speaking countries',
        'Punctuality expectations are different - being 15-30 minutes late is often acceptable',
        'In business contexts, deadlines may be more flexible than in Anglo cultures',
        'This reflects a cultural value of relationships over rigid schedules'
      ],
      etiquetteRules: [
        'Don\'t take "mañana" literally - it may mean "later" rather than specifically tomorrow',
        'In professional settings, confirm specific times and follow up'
      ],
      commonMistakes: [
        'Expecting the same punctuality standards as in English-speaking countries',
        'Getting frustrated when "mañana" doesn\'t mean exactly tomorrow'
      ],
      relatedConcepts: ['tiempo', 'puntualidad', 'horario'],
      practiceExercises: ['Practice talking about future plans using mañana']
    });

    vi.spyOn(geminiService, 'generateContent').mockResolvedValue(mockResponse);

    const result = await geminiService.explainConcept({
      question: 'What does mañana mean and how is it used?',
      context: { currentLesson: 'Time Expressions' },
      proficiencyLevel: 'Intermediate'
    });

    expect(result.explanation).toContain('cultural significance');
    expect(result.culturalNotes).toBeDefined();
    expect(result.culturalNotes.length).toBeGreaterThanOrEqual(4);
    expect(result.culturalNotes[0]).toContain('Mañana culture');
    expect(result.etiquetteRules).toBeDefined();
    expect(result.etiquetteRules.length).toBeGreaterThanOrEqual(2);
  });

  /**
   * Test: AI tutor provides etiquette guidance
   * Requirements: 16.2, 16.3
   */
  it('should provide etiquette rules in tutor responses about social situations', async () => {
    const mockResponse = JSON.stringify({
      explanation: 'Invitations in Spanish culture carry significant social weight. Declining an invitation, especially to a family event, can be seen as rejecting the relationship itself.',
      examples: [
        '¿Quieres venir a cenar? (Do you want to come to dinner?)',
        'Me encantaría, gracias (I would love to, thank you)'
      ],
      culturalNotes: [
        'Invitations are often extended multiple times - the first may be pro forma',
        'Accepting an invitation creates a social obligation to reciprocate',
        'Family invitations are particularly important and should be prioritized',
        'Last-minute invitations are common and not considered rude'
      ],
      etiquetteRules: [
        'If you must decline, provide a specific reason and express regret',
        'Bring a small gift when invited to someone\'s home',
        'Arrive 15-30 minutes late to dinner parties (not business meetings)',
        'Stay for sobremesa - leaving immediately after eating is rude'
      ],
      commonMistakes: [
        'Declining invitations too casually without explanation',
        'Arriving exactly on time to social events',
        'Leaving immediately after the meal ends'
      ],
      relatedConcepts: ['hospitalidad', 'compromiso social', 'reciprocidad'],
      practiceExercises: ['Practice accepting and declining invitations politely']
    });

    vi.spyOn(geminiService, 'generateContent').mockResolvedValue(mockResponse);

    const result = await geminiService.explainConcept({
      question: 'How should I respond to invitations in Spanish?',
      context: { currentLesson: 'Social Interactions' },
      proficiencyLevel: 'Advanced'
    });

    expect(result.etiquetteRules).toBeDefined();
    expect(result.etiquetteRules.length).toBeGreaterThanOrEqual(4);
    expect(result.etiquetteRules.some((rule: string) => rule.toLowerCase().includes('gift'))).toBe(true);
    expect(result.commonMistakes).toBeDefined();
    expect(result.commonMistakes.length).toBeGreaterThanOrEqual(2);
  });

  /**
   * Test: AI tutor explains common cultural mistakes
   * Requirements: 16.3
   */
  it('should warn about common cultural mistakes in tutor responses', async () => {
    const mockResponse = JSON.stringify({
      explanation: 'Physical contact in greetings varies significantly across Spanish-speaking cultures. Understanding these differences helps avoid awkward situations.',
      examples: [
        'In Spain: two kisses on the cheek (starting with right)',
        'In Latin America: often one kiss or a handshake',
        'In professional settings: handshake is standard'
      ],
      culturalNotes: [
        'The "dos besos" (two kisses) in Spain are air kisses with cheek contact',
        'Men typically shake hands with other men, kiss women',
        'Close male friends may hug (abrazo)',
        'Physical contact shows warmth and acceptance'
      ],
      etiquetteRules: [
        'Follow the other person\'s lead in greetings',
        'In business, wait for the other person to initiate physical contact',
        'Always greet everyone in a group individually',
        'Maintain appropriate personal space in professional contexts'
      ],
      commonMistakes: [
        'Avoiding physical contact entirely - can seem cold or unfriendly',
        'Kissing on the lips instead of cheeks (major faux pas)',
        'Starting with the wrong cheek (left instead of right in Spain)',
        'Not greeting everyone individually in a group',
        'Being too physically distant in social contexts'
      ],
      relatedConcepts: ['saludos', 'contacto físico', 'espacio personal'],
      practiceExercises: ['Observe and practice appropriate greeting styles']
    });

    vi.spyOn(geminiService, 'generateContent').mockResolvedValue(mockResponse);

    const result = await geminiService.explainConcept({
      question: 'How do I greet people with kisses in Spanish culture?',
      context: { currentLesson: 'Greetings and Introductions' },
      proficiencyLevel: 'Beginner'
    });

    expect(result.commonMistakes).toBeDefined();
    expect(result.commonMistakes.length).toBeGreaterThanOrEqual(3);
    expect(result.commonMistakes.some((m: string) => m.includes('faux pas') || m.includes('cold') || m.includes('wrong cheek'))).toBe(true);
  });

  /**
   * Test: AI tutor provides practical cultural tips
   * Requirements: 16.3, 16.4
   */
  it('should provide practical tips for real-world cultural situations', async () => {
    const mockResponse = JSON.stringify({
      explanation: 'Shopping in Spanish-speaking countries involves different customs and expectations than in English-speaking countries. Understanding these helps you navigate stores and markets successfully.',
      examples: [
        '¿Cuánto cuesta? (How much does it cost?)',
        '¿Me puede hacer un descuento? (Can you give me a discount?)'
      ],
      culturalNotes: [
        'Small talk with shopkeepers is expected and builds rapport',
        'Bargaining is common in markets but not in established stores',
        'Cash is still widely used, especially in smaller establishments',
        'Shopping hours include long lunch breaks (2-5 PM)'
      ],
      etiquetteRules: [
        'Greet shopkeepers when entering and leaving',
        'Don\'t touch produce without asking permission',
        'In clothing stores, ask before trying things on',
        'Be patient - service may be slower than you\'re used to'
      ],
      commonMistakes: [
        'Not greeting the shopkeeper upon entering',
        'Trying to bargain in department stores or chain stores',
        'Being impatient or demanding with service staff',
        'Not having cash for small purchases'
      ],
      relatedConcepts: ['compras', 'mercado', 'regatear', 'precio'],
      practiceExercises: [
        'Practice polite shopping phrases',
        'Role-play bargaining at a market',
        'Learn to ask prices and make purchases politely'
      ]
    });

    vi.spyOn(geminiService, 'generateContent').mockResolvedValue(mockResponse);

    const result = await geminiService.explainConcept({
      question: 'What should I know about shopping in Spanish-speaking countries?',
      context: { currentLesson: 'Shopping and Commerce' },
      proficiencyLevel: 'Intermediate'
    });

    expect(result.culturalNotes).toBeDefined();
    expect(result.culturalNotes.length).toBeGreaterThanOrEqual(4);
    expect(result.etiquetteRules).toBeDefined();
    expect(result.etiquetteRules.length).toBeGreaterThanOrEqual(4);
    
    // Verify practical, actionable advice
    const allContent = [...result.culturalNotes, ...result.etiquetteRules].join(' ');
    expect(allContent).toContain('Greet');
    expect(allContent.toLowerCase()).toContain('cash' || 'money' || 'payment');
  });
});
