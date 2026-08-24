// Implements the counting rules from Documentation/Architecture/AI_Recognition.md
// ("Counting & business rules"):
//   - piece products: every classified instance = 1 unit, counted per product.
//   - whole products: if every detected region in the photo agrees on one
//     product, collapse to 1 unit. If the photo's whole-type regions split
//     across two+ products (e.g. half poppyseed / half raspberry), do NOT
//     collapse — count units per product (per slice).
//
// classifiedRegions: [{ productId, productName, unitType, confidence }]
export function aggregateRegions(classifiedRegions) {
  const pieceRegions = classifiedRegions.filter((r) => r.unitType === "piece");
  const wholeRegions = classifiedRegions.filter((r) => r.unitType === "whole");

  const results = [];

  const groupBy = (regions) => {
    const groups = new Map();
    for (const r of regions) {
      if (!groups.has(r.productId)) groups.set(r.productId, []);
      groups.get(r.productId).push(r);
    }
    return groups;
  };

  const avgConfidence = (regions) => regions.reduce((sum, r) => sum + r.confidence, 0) / regions.length;

  for (const [productId, regions] of groupBy(pieceRegions)) {
    results.push({
      productId,
      productName: regions[0].productName,
      quantity: regions.length,
      confidence: avgConfidence(regions),
    });
  }

  const wholeGroups = groupBy(wholeRegions);
  const distinctWholeProducts = wholeGroups.size;

  if (distinctWholeProducts === 1) {
    const [[productId, regions]] = wholeGroups;
    results.push({
      productId,
      productName: regions[0].productName,
      quantity: 1,
      confidence: avgConfidence(regions),
    });
  } else if (distinctWholeProducts > 1) {
    for (const [productId, regions] of wholeGroups) {
      results.push({
        productId,
        productName: regions[0].productName,
        quantity: regions.length,
        confidence: avgConfidence(regions),
      });
    }
  }

  return results;
}
