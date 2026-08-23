# 🧪 Test Plan — AI Recognition Accuracy

> [!NOTE]
> This is separate from general software testing (UI, API endpoints, etc.) — it's specifically about proving the AI recognition works, with evidence that holds up during the maturita defense.

---

## 🎯 Why a separate, persisted test set

Training photos are deleted right after their embedding is extracted (see [AI_Recognition.md](../Architecture/AI_Recognition.md)) — that's by design, but it also means training data can't double as evidence of accuracy after the fact. So a **small, explicitly marked set of photos is kept permanently** (currently: on localhost, not deleted, not used to build prototypes) purely to measure how well the system performs.

**Rule:** a photo is either training data (used to build a prototype, then deleted) or test data (never used to build a prototype, kept forever) — never both. Mixing the two would make accuracy numbers meaningless (the system would be "tested" on photos it already memorized).

---

## 📦 What the test set contains

- A handful of photos per product (e.g. 2–3), taken separately from the 5+ reference photos used for training.
- Ideally varied on purpose: different lighting, different angle than the training set, maybe a slightly messier real-world crate — the point is to simulate what a driver's phone photo will actually look like, not a perfect studio shot.
- Stored in `TestImage` (see [Data_Model.md](../Architecture/Data_Model.md)), tagged with the correct/expected product.

---

## ▶️ Running a test pass

1. For each `TestImage`, run it through the same recognition pipeline a real delivery photo would go through (embedding → compare against stored prototypes).
2. Record: predicted product, confidence score, correct or not.
3. Aggregate into simple metrics:
   - **Top-1 accuracy** — % of test images where the best match was the correct product.
   - **Confidence distribution for correct vs. incorrect matches** — used to sanity-check where the confidence threshold (see [AI_Recognition.md](../Architecture/AI_Recognition.md)) should sit.

This test pass is re-run whenever a new product is added (to catch products that get confused with existing ones) and can be re-run on demand before the defense to produce a fresh accuracy report.

---

## 🔍 Specific scenarios worth testing deliberately

Beyond the aggregate accuracy number, a few scenarios are worth testing (and showing) individually:

| Scenario | What it proves |
|---|---|
| Two visually similar products (e.g. two chocolate cakes with different filling) | Whether embeddings actually separate look-alikes, or whether the product catalog needs more/better reference photos |
| Photo of a product **not in the system at all** | The system should show low confidence and fall back to manual selection, not confidently misidentify it as something else |
| Group photo of many small identical items | Confirms product *type* is still recognized correctly even though quantity is entered manually (see the [counting scope note](../Architecture/AI_Recognition.md#-counting-strategy--scope-note)) |
| Poor lighting / off-angle photo | Realistic worst case for what a driver will actually photograph in a cooler |

---

## 📈 Using this for the defense

Since raw training photos are gone by the time of the defense, this test set + its accuracy report is the concrete, reproducible evidence to show: "here are photos the system never trained on, here's what it got right and wrong, here's the accuracy number." That's a stronger defense story than "trust me, it usually works."
