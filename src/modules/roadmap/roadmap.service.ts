import { Trino } from "trino-client";
import { prisma } from "../../config/db";
import { RoadmapNodeStatus } from "@prisma/client";
import {
  RoadmapQuestionGeneratorService,
  type SkillGenerationInput,
} from "./ai/roadmap-gen.service";

const trino = Trino.create({
  server: process.env.TRINO_SERVER || "http://localhost:8080",
  catalog: process.env.TRINO_CATALOG || "iceberg",
  schema: process.env.TRINO_SCHEMA || "analytics",
  user: process.env.TRINO_USER || "admin",
});

const roadmapGenerator = new RoadmapQuestionGeneratorService();

type UserWeakSkillRow = {
  user_id: string;
  skill_id: number;
  skill_name: string;
  skill_slug: string;
  accuracy: number | string;
  total_attempted_questions?: number | string;
};

export interface UpdateNodeStatusInput {
  nodeId: string;
  status: RoadmapNodeStatus;
  userId?: string;
}

async function executeQuery<T = any>(query: string): Promise<T[]> {
  const iter = await trino.query(query);

  const rows: T[] = [];
  let columns: string[] = [];

  try {
    for await (const res of iter) {
      if (res.columns && columns.length === 0) {
        columns = res.columns.map((column: any) => column.name);
      }

      if (res.data) {
        for (const row of res.data) {
          if (Array.isArray(row)) {
            const mappedRow: Record<string, any> = {};

            columns.forEach((column, index) => {
              mappedRow[column] = row[index];
            });

            rows.push(mappedRow as T);
          } else {
            rows.push(row as T);
          }
        }
      }
    }
  } finally {
    if (typeof iter.return === "function") {
      await iter.return();
    }
  }

  return rows;
}

/**
 * Fetch an existing user roadmap along with its ordered nodes.
 */
export async function getUserRoadmap(userId: string) {
  if (!userId || typeof userId !== "string") {
    throw new Error("A valid string userId is required to fetch a roadmap.");
  }

  const roadmap = await prisma.roadmap.findUnique({
    where: { userId },
    include: {
      nodes: {
        orderBy: { order: "asc" },
        include: {
          skill: {
            select: {
              id: true,
              name: true,
              category: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  return roadmap;
}

/**
 * Generate (or regenerate) a personalized roadmap based on weak skills in Trino.
 */
export async function generateUserRoadmapTest(userId: string) {
  if (!userId || typeof userId !== "string") {
    throw new Error(
      "A valid string userId is required to generate a personalized roadmap.",
    );
  }

  console.log(
    `Starting personalized TOEIC test generation for user: ${userId}`,
  );

  // 1. Query Trino for top 5 weakest skills
  const weakSkillRows = await executeQuery<UserWeakSkillRow>(
    `
      SELECT
        user_id,
        skill_id,
        skill_name,
        skill_slug,
        accuracy
      FROM iceberg.analytics.user_skill_performance
      WHERE user_id = '${userId}'
      ORDER BY accuracy ASC
      LIMIT 5
    `,
  );

  console.log(`User weak skill rows returned: ${weakSkillRows.length}`);

  if (weakSkillRows.length === 0) {
    throw new Error(`No performance data found in Trino for user ${userId}`);
  }

  const skillIds = weakSkillRows.map((skill) => Number(skill.skill_id));

  if (
    skillIds.some(
      (skillId) =>
        Number.isNaN(skillId) || skillId === undefined || skillId === null,
    )
  ) {
    throw new Error(
      `Invalid skill IDs returned from Trino for user ${userId}: ${JSON.stringify(
        weakSkillRows.map((s) => s.skill_id),
      )}`,
    );
  }

  const accuracyBySkillId = new Map<number, number>(
    weakSkillRows.map((row) => {
      const parsedAccuracy =
        typeof row.accuracy === "string"
          ? parseFloat(row.accuracy)
          : row.accuracy;
      return [
        Number(row.skill_id),
        Number.isNaN(parsedAccuracy) ? 0 : parsedAccuracy,
      ];
    }),
  );

  // 2. Fetch Prisma details for user weak skills
  const skills = await prisma.skill.findMany({
    where: {
      id: {
        in: skillIds,
      },
    },
    include: {
      parent: true,
    },
  });

  const skillsById = new Map(skills.map((skill) => [skill.id, skill]));

  const generationSkills: SkillGenerationInput[] = weakSkillRows.map(
    (weakSkill) => {
      const skill = skillsById.get(Number(weakSkill.skill_id));

      if (!skill) {
        throw new Error(
          `Skill ${weakSkill.skill_id} was not found in Prisma DB.`,
        );
      }

      return {
        skillId: skill.id,
        skillName: skill.name,
        description: skill.description,
        category: skill.category,
        parentSkillName: skill.parent?.name ?? null,
      };
    },
  );

  console.log(
    `🤖 Generating interactive exercises across ${generationSkills.length} skills...`,
  );

  // 3. Generate exercises per target skill & final review in parallel
  const [skillNodesContentMap, finalReviewNodeContent] = await Promise.all([
    roadmapGenerator.generateNodeContentForSkills(generationSkills),
    roadmapGenerator.generateFinalNodeContent(generationSkills),
  ]);

  // 4. Store/Save generated Roadmap & Nodes in Prisma
  const savedRoadmap = await prisma.$transaction(
    async (tx) => {
      const roadmap = await tx.roadmap.upsert({
        where: { userId },
        update: {
          title: "Personalized Skill Improvement Roadmap",
          updatedAt: new Date(),
        },
        create: {
          userId,
          title: "Personalized Skill Improvement Roadmap",
        },
      });

      await tx.roadmapNode.deleteMany({
        where: { roadmapId: roadmap.id },
      });

      const nodesToCreate = generationSkills.map((skill, index) => {
        const content = skillNodesContentMap.get(skill.skillId);
        if (!content) {
          throw new Error(
            `Missing exercise content for skill ID ${skill.skillId}`,
          );
        }

        const order = index + 1;

        return {
          roadmapId: roadmap.id,
          skillId: skill.skillId,
          content: content as any,
          order,
          status:
            order === 1
              ? RoadmapNodeStatus.AVAILABLE
              : RoadmapNodeStatus.LOCKED,
          isFinal: false,
          accuracyAtGeneration: accuracyBySkillId.get(skill.skillId) ?? null,
        };
      });

      const finalOrder = generationSkills.length + 1;
      nodesToCreate.push({
        roadmapId: roadmap.id,
        skillId: null,
        content: finalReviewNodeContent as any,
        order: finalOrder,
        status: RoadmapNodeStatus.LOCKED,
        isFinal: true,
        accuracyAtGeneration: null,
      });

      await tx.roadmapNode.createMany({
        data: nodesToCreate,
      });

      return await tx.roadmap.findUnique({
        where: { id: roadmap.id },
        include: {
          nodes: {
            orderBy: { order: "asc" },
          },
        },
      });
    },
    {
      maxWait: 30_000,
      timeout: 120_000,
    },
  );

  console.log(`✅ Personalized roadmap successfully saved for user ${userId}`);

  return {
    userId,
    roadmapId: savedRoadmap?.id,
    generatedNodesCount: savedRoadmap?.nodes.length ?? 0,
    nodes: savedRoadmap?.nodes ?? [],
  };
}

/**
 * Update the status of a specific RoadmapNode.
 * Automatically unlocks the next node in sequence when a node is set to COMPLETED.
 */
export async function updateRoadmapNodeStatus({
  nodeId,
  status,
  userId,
}: UpdateNodeStatusInput) {
  if (!nodeId || typeof nodeId !== "string") {
    throw new Error("A valid string nodeId is required.");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Get current node details and parent roadmap info
    const currentNode = await tx.roadmapNode.findUnique({
      where: { id: nodeId },
      include: {
        roadmap: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!currentNode) {
      throw new Error(`RoadmapNode with ID '${nodeId}' was not found.`);
    }

    // 2. Optional ownership validation
    if (userId && currentNode.roadmap.userId !== userId) {
      throw new Error("Unauthorized: Node does not belong to this user.");
    }

    // 3. Update target node status
    const updatedNode = await tx.roadmapNode.update({
      where: { id: nodeId },
      data: { status },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            category: true,
            slug: true,
          },
        },
      },
    });

    // 4. Sequential Unlocking: Automatically unlock next node if current is marked COMPLETED
    if (status === RoadmapNodeStatus.COMPLETED) {
      const nextNode = await tx.roadmapNode.findFirst({
        where: {
          roadmapId: currentNode.roadmapId,
          order: currentNode.order + 1,
        },
      });

      if (nextNode && nextNode.status === RoadmapNodeStatus.LOCKED) {
        await tx.roadmapNode.update({
          where: { id: nextNode.id },
          data: { status: RoadmapNodeStatus.AVAILABLE },
        });
      }

      // 5. Update overall roadmap status if all nodes are completed
      const remainingIncomplete = await tx.roadmapNode.count({
        where: {
          roadmapId: currentNode.roadmapId,
          status: { not: RoadmapNodeStatus.COMPLETED },
        },
      });

      if (remainingIncomplete === 0) {
        await tx.roadmap.update({
          where: { id: currentNode.roadmapId },
          data: { status: "COMPLETED" },
        });
      }
    }

    return updatedNode;
  });
}
