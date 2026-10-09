export function seed(db) {
  const run = (sql, ...p) => db.prepare(sql).run(...p);
  const lessons = [
    {
      id: "photosynthesis",
      title: "How plants make their food",
      subject: "Life Sciences",
      topic: "Photosynthesis",
      minutes: 8,
      body: [
        {
          heading: "Start with the big idea",
          text: "Plants use light energy to make glucose, a sugar. This process is called photosynthesis. It happens mainly in the chloroplasts of leaf cells.",
        },
        {
          heading: "What goes in?",
          text: "The plant takes in water through its roots and carbon dioxide through tiny pores in the leaves. Chlorophyll, a green pigment, absorbs light energy.",
        },
        {
          heading: "What comes out?",
          text: "The plant makes glucose and releases oxygen. Glucose stores chemical energy. The plant can use glucose for respiration or convert it into starch for storage.",
        },
        {
          heading: "Put the pieces together",
          text: "Carbon dioxide + water → glucose + oxygen, using light energy and chlorophyll. Matter is rearranged; sunlight supplies the energy.",
        },
        {
          heading: "Try explaining it",
          text: "Imagine a leaf as a small kitchen. Water and carbon dioxide are the ingredients, sunlight is the energy, and glucose is the food that is made. This is an analogy, not a literal description of a cell.",
        },
      ],
      cards: [
        [
          "What is photosynthesis?",
          "The process in which plants use light energy to make glucose from carbon dioxide and water.",
        ],
        ["Which pigment absorbs light energy?", "Chlorophyll."],
        [
          "What two raw materials does a plant need?",
          "Water and carbon dioxide.",
        ],
        ["Which gas is released?", "Oxygen."],
      ],
      questions: [
        [
          "Where does photosynthesis mainly happen?",
          ["Chloroplasts", "Nucleus", "Roots only"],
          0,
          "Chloroplasts contain chlorophyll, which absorbs light energy.",
        ],
        [
          "What supplies the energy?",
          ["Soil", "Sunlight", "Oxygen"],
          1,
          "Light supplies the energy needed to make glucose.",
        ],
        [
          "Which substance is produced?",
          ["Carbon dioxide", "Glucose", "Chlorophyll"],
          1,
          "Glucose is a sugar produced during photosynthesis.",
        ],
      ],
    },
    {
      id: "equations",
      title: "Find the missing number",
      subject: "Mathematics",
      topic: "Linear equations",
      minutes: 7,
      body: [
        {
          heading: "An equation is a balance",
          text: "An equation says that two expressions have the same value. In x + 3 = 8, x is the number that makes the statement true.",
        },
        {
          heading: "Keep both sides equal",
          text: "Subtract 3 from both sides: x + 3 − 3 = 8 − 3. This gives x = 5. Doing the same operation to both sides keeps the equation balanced.",
        },
        {
          heading: "Work through two steps",
          text: "For 2x + 4 = 14, first subtract 4 from each side. You get 2x = 10. Then divide both sides by 2. The answer is x = 5.",
        },
        {
          heading: "Check your answer",
          text: "Substitute 5 into the original equation: 2 × 5 + 4 = 14. The two sides are equal, so the solution is correct.",
        },
      ],
      cards: [
        ["Solve x + 3 = 8.", "x = 5. Subtract 3 from both sides."],
        ["Solve 2x = 10.", "x = 5. Divide both sides by 2."],
        [
          "How do you check a solution?",
          "Substitute it into the original equation and check both sides are equal.",
        ],
      ],
      questions: [
        [
          "Solve x − 2 = 6.",
          ["4", "8", "12"],
          1,
          "Add 2 to both sides, so x = 8.",
        ],
        [
          "First step for 3x + 2 = 11?",
          ["Add 2", "Divide only the left side", "Subtract 2 from both sides"],
          2,
          "Subtracting 2 from both sides gives 3x = 9.",
        ],
        [
          "Solve 3x = 9.",
          ["27", "6", "3"],
          2,
          "Divide both sides by 3, giving x = 3.",
        ],
      ],
    },
    {
      id: "main-idea",
      title: "Find the heart of a paragraph",
      subject: "English",
      topic: "Reading for meaning",
      minutes: 6,
      body: [
        {
          heading: "What is the main idea?",
          text: "The main idea is the most important point a paragraph makes. Supporting details explain it, give examples or add evidence.",
        },
        {
          heading: "Read a short example",
          text: "Trees help city neighbourhoods stay cooler. Their leaves provide shade, and water released from leaves helps cool the air. Parks with many trees can offer a break from hot streets.",
        },
        {
          heading: "Find the common thread",
          text: "The main idea is that trees help cool cities. Shade and water released from leaves are supporting details that explain how.",
        },
        {
          heading: "Practise in your own words",
          text: "Ask: what is this paragraph mostly telling me? Write one short sentence. Then check that the supporting details fit your sentence.",
        },
      ],
      cards: [
        ["What is a main idea?", "The most important point of a paragraph."],
        [
          "What do supporting details do?",
          "Explain, illustrate or provide evidence for the main idea.",
        ],
        [
          "How can you check your main idea?",
          "Check whether the supporting details fit your summary sentence.",
        ],
      ],
      questions: [
        [
          "What best describes a main idea?",
          ["Every fact in a text", "The central point", "Only the first word"],
          1,
          "The main idea is the central point that details support.",
        ],
        [
          "In the example, shade is…",
          ["A supporting detail", "The author’s name", "An unrelated topic"],
          0,
          "Shade explains one way trees help cool cities.",
        ],
      ],
    },
  ];
  for (const l of lessons) {
    run(
      "INSERT OR IGNORE INTO lessons VALUES(?,?,?,?,?,?,?)",
      l.id,
      l.title,
      l.subject,
      l.topic,
      l.minutes,
      JSON.stringify(l.body),
      "FunaLearn introductory lesson · educator review recommended",
    );
    run(
      "INSERT OR IGNORE INTO decks VALUES(?,?,?,NULL,NULL)",
      l.id,
      l.topic,
      l.id,
    );
    l.cards.forEach((c, i) =>
      run(
        "INSERT OR IGNORE INTO cards VALUES(?,?,?,?)",
        `${l.id}-${i}`,
        l.id,
        ...c,
      ),
    );
    run(
      "INSERT OR IGNORE INTO quizzes VALUES(?,?,?,NULL,NULL)",
      l.id,
      l.topic,
      l.id,
    );
    l.questions.forEach((q, i) =>
      run(
        "INSERT OR IGNORE INTO questions VALUES(?,?,?,?,?,?)",
        `${l.id}-q${i}`,
        l.id,
        q[0],
        JSON.stringify(q[1]),
        q[2],
        q[3],
      ),
    );
  }
}
