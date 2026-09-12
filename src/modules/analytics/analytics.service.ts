import { Trino } from "trino-client";

const trino = Trino.create({
  server: "http://localhost:8080",
  catalog: "iceberg",
  schema: "analytics",
  user: "admin",
});

async function executeQuery(query: string) {
  const iter = await trino.query({ query });

  const rows: any[] = [];

  for await (const res of iter) {
    if (res.data) {
      rows.push(...res.data);
    }
  }

  return rows;
}

// ============================================================
// Social Ranking
// ============================================================

export async function getUserRanking() {
  return executeQuery(`
    SELECT
        social_rank,
        user_id,
        name,
        social_score,

        chat_message_count,
        forum_post_count,
        forum_comment_count,

        post_upvotes_received,
        comment_upvotes_received,

        post_votes_given,
        comment_votes_given,

        posts_saved

    FROM iceberg.gold.user_social_ranking

    ORDER BY social_rank

    LIMIT 10
  `);
}

// ============================================================
// User Skill Summary
// Dashboard overview
// ============================================================

export async function getUserSkillSummary(userId: string) {
  const safeUserId = userId.replace(/'/g, "''");

  return executeQuery(`
    SELECT
        user_id,

        skill_id,
        skill_name,
        category,

        attempted_questions,
        correct_questions,
        incorrect_questions,

        accuracy,
        confidence

    FROM iceberg.analytics.user_skill_summary

    WHERE user_id = '${safeUserId}'

    ORDER BY accuracy DESC
  `);
}

// ============================================================
// User Skill Performance
// Detailed child skills for AI
// ============================================================

export async function getUserSkillPerformance(userId: string) {
  const safeUserId = userId.replace(/'/g, "''");

  return executeQuery(`
    SELECT
        user_id,

        skill_id,
        skill_name,

        parent_skill_id,
        parent_skill_name,

        attempted_questions,
        correct_questions,
        incorrect_questions,

        accuracy,
        confidence

    FROM iceberg.analytics.user_skill_performance

    WHERE user_id = '${safeUserId}'

    ORDER BY accuracy ASC
  `);
}

// ============================================================
// Weak Skills For AI Roadmap
// ============================================================

export async function getUserWeakSkills(userId: string, limit = 10) {
  const safeUserId = userId.replace(/'/g, "''");

  return executeQuery(`
    SELECT
        skill_id,
        skill_name,
        parent_skill_name,

        accuracy,
        attempted_questions,
        confidence

    FROM iceberg.analytics.user_skill_performance

    WHERE user_id = '${safeUserId}'

    AND parent_skill_id IS NOT NULL

    ORDER BY accuracy ASC

    LIMIT ${limit}
  `);
}
