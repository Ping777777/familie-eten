import { put, head } from "@vercel/blob";

const WEEK_PLAN_PATH = globalThis.process?.env?.WEEK_PLAN_BLOB_PATH || "week-plan.json";

const DAYS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
const FAMILY = ["Papa", "Mama", "Inga", "Kevin"];

const emptyWeek = () =>
  DAYS.reduce((acc, day) => {
    acc[day] = FAMILY.reduce((a, m) => { a[m] = null; return a; }, {});
    return acc;
  }, {});

async function readCurrentData() {
  try {
    const blobInfo = await head(WEEK_PLAN_PATH);
    const response = await fetch(blobInfo.downloadUrl ?? blobInfo.url);
    if (!response.ok) return { 0: emptyWeek() };
    return await response.json();
  } catch (error) {
    if (error?.status === 404) return { 0: emptyWeek() };
    throw error;
  }
}

async function writeData(data) {
  await put(WEEK_PLAN_PATH, JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const blobInfo = await head(WEEK_PLAN_PATH);
      const response = await fetch(blobInfo.downloadUrl ?? blobInfo.url);
      if (!response.ok) throw new Error("Failed to fetch blob content");
      const data = await response.json();
      res.status(200).json(data);
    } catch (error) {
      if (error?.status === 404) {
        res.status(404).json({ message: "No week plan found" });
      } else {
        res.status(500).json({ message: "Failed to read week plan" });
      }
    }
  } else if (req.method === "PATCH") {
    // Granular read-modify-write: only the changed slot is applied on top of
    // the current server state, so concurrent edits to different slots are
    // preserved instead of overwritten.
    try {
      const { op, weekOffset, day, member, recipeId } = req.body;
      const current = await readCurrentData();

      if (op === "assign") {
        const week = current[weekOffset] ?? emptyWeek();
        current[weekOffset] = {
          ...week,
          [day]: { ...(week[day] ?? {}), [member]: recipeId ?? null },
        };
      } else if (op === "clearRecipe") {
        Object.keys(current).forEach((offset) => {
          DAYS.forEach((d) => {
            FAMILY.forEach((m) => {
              if (current[offset][d]?.[m] === recipeId) {
                current[offset] = {
                  ...current[offset],
                  [d]: { ...current[offset][d], [m]: null },
                };
              }
            });
          });
        });
      } else {
        res.status(400).json({ message: "Unknown operation" });
        return;
      }

      await writeData(current);
      res.status(200).json(current);
    } catch {
      res.status(500).json({ message: "Failed to update week plan" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
