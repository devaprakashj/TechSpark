const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

/**
 * Fetches a list of problem titleSlugs from LeetCode by difficulty.
 */
export async function fetchProblemsByDifficulty(difficulty = "EASY", limit = 30) {
    const query = `
    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug
        limit: $limit
        skip: $skip
        filters: $filters
      ) {
        total: totalNum
        questions: data {
          questionId
          title
          titleSlug
          difficulty
          isPaidOnly
        }
      }
    }
    `;

    const variables = {
        categorySlug: "",
        skip: Math.floor(Math.random() * 50),
        limit: limit,
        filters: { difficulty: difficulty.toUpperCase() }
    };

    try {
        const response = await fetch(LEETCODE_GRAPHQL_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            body: JSON.stringify({ query, variables })
        });

        if (response.ok) {
            const data = await response.json();
            const questions = data?.data?.problemsetQuestionList?.questions || [];
            return questions.filter(q => !q.isPaidOnly);
        }
    } catch (error) {
        console.error("Error fetching problem list from LeetCode:", error);
    }
    return [];
}

/**
 * Fetches detailed problem statement and example test cases for a titleSlug.
 */
export async function fetchProblemDetails(titleSlug) {
    const query = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        title
        titleSlug
        content
        difficulty
        exampleTestcases
        codeSnippets {
          lang
          langSlug
          code
        }
        topicTags {
          name
        }
      }
    }
    `;

    try {
        const response = await fetch(LEETCODE_GRAPHQL_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            body: JSON.stringify({ query, variables: { titleSlug } })
        });

        if (response.ok) {
            const data = await response.json();
            return data?.data?.question || null;
        }
    } catch (error) {
        console.error(`Error fetching problem details for ${titleSlug}:`, error);
    }
    return null;
}

/**
 * Returns a random LeetCode challenge formatted for TechSpark.
 */
export async function getRandomLeetCodeChallenge(difficulty = "EASY") {
    let problems = await fetchProblemsByDifficulty(difficulty, 30);
    if (!problems.length) {
        problems = await fetchProblemsByDifficulty("EASY", 30);
    }

    if (!problems.length) return null;

    const selected = problems[Math.floor(Math.random() * problems.length)];
    const details = await fetchProblemDetails(selected.titleSlug);
    return details;
}
