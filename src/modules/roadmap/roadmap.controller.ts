import { type Request, type Response } from "express";
import { RoadmapNodeStatus } from "@prisma/client";
import {
  generateUserRoadmapTest,
  getUserRoadmap,
  updateRoadmapNodeStatus,
} from "./roadmap.service";

export class RoadmapController {
  /**
   * 📖 GET USER ROADMAP
   * Fetches the current user's roadmap and learning nodes.
   */
  getRoadmap = async (req: Request, res: Response): Promise<void> => {
    try {
      const authenticatedUser = (req as any).user;
      const isAdmin = authenticatedUser?.role === "ADMIN";

      const userId = isAdmin
        ? req.params?.userId ||
          (req.query?.userId as string) ||
          authenticatedUser?.id
        : authenticatedUser?.id;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: "User ID is required.",
        });
        return;
      }

      const roadmap = await getUserRoadmap(userId);

      if (!roadmap) {
        res.status(404).json({
          success: false,
          message: "No roadmap found for this user. Generate one first.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: roadmap,
      });
    } catch (error: any) {
      console.error("Error fetching user roadmap:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch user roadmap.",
      });
    }
  };

  /**
   * 🤖 GENERATE PERSONALIZED USER ROADMAP EXERCISES
   */
  generateRoadmapTest = async (req: Request, res: Response): Promise<void> => {
    try {
      const authenticatedUser = (req as any).user;
      const isAdmin = authenticatedUser?.role === "ADMIN";

      let userId: string | undefined;

      if (isAdmin) {
        userId =
          req.body?.userId ||
          req.params?.userId ||
          (req.query?.userId as string) ||
          authenticatedUser?.id;
      } else {
        userId = authenticatedUser?.id;
      }

      if (!userId || typeof userId !== "string") {
        res.status(400).json({
          success: false,
          message: "User ID is required to generate a personalized roadmap.",
        });
        return;
      }

      const data = await generateUserRoadmapTest(userId);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error("Error generating user roadmap:", error);

      if (error.message?.includes("No performance data found")) {
        res.status(404).json({
          success: false,
          message:
            "Not enough performance data to build a personalized roadmap. Complete a baseline diagnostic first.",
        });
        return;
      }

      if (error.message?.includes("Invalid skill IDs")) {
        res.status(422).json({
          success: false,
          message:
            "Unable to generate roadmap due to corrupt or invalid skill data.",
        });
        return;
      }

      res.status(500).json({
        success: false,
        message:
          error.message || "Failed to generate personalized roadmap exercises.",
      });
    }
  };

  /**
   * 🔄 UPDATE ROADMAP NODE STATUS
   * Changes status (e.g. IN_PROGRESS, COMPLETED) and unlocks sequential nodes.
   */
  updateNodeStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const authenticatedUser = (req as any).user;
      const isAdmin = authenticatedUser?.role === "ADMIN";

      const nodeId = req.params?.nodeId || req.body?.nodeId;
      const { status } = req.body;

      if (!nodeId || typeof nodeId !== "string") {
        res.status(400).json({
          success: false,
          message: "Node ID is required.",
        });
        return;
      }

      if (!status || !Object.values(RoadmapNodeStatus).includes(status)) {
        res.status(400).json({
          success: false,
          message: `Invalid or missing status. Valid options are: ${Object.values(
            RoadmapNodeStatus,
          ).join(", ")}`,
        });
        return;
      }

      // Non-admin users are restricted to updating their own roadmap nodes
      const userId = isAdmin ? undefined : authenticatedUser?.id;

      const updatedNode = await updateRoadmapNodeStatus({
        nodeId,
        status,
        userId,
      });

      res.status(200).json({
        success: true,
        data: updatedNode,
      });
    } catch (error: any) {
      console.error("Error updating roadmap node status:", error);

      if (error.message?.includes("not found")) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message?.includes("Unauthorized")) {
        res.status(403).json({
          success: false,
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Failed to update roadmap node status.",
      });
    }
  };
}
