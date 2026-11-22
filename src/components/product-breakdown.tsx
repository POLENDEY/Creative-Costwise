"use client";

import { ChevronDown, Wrench } from "lucide-react";
import { formatMoney, type Currency } from "@/lib/money";
import { parseProductCostBreakdown } from "@/lib/product-breakdown";

export function ProductBreakdown({
  breakdownJson,
  currency,
}: {
  breakdownJson: string;
  currency: Currency;
}) {
  const breakdown = parseProductCostBreakdown(breakdownJson);
  return (
    <details className="product-breakdown">
      <summary><Wrench size={14} /> View product details &amp; cost breakdown <ChevronDown size={14} /></summary>
      <div className="breakdown-content">
        <div className="breakdown-cost-group">
          <b>Materials · per finished piece</b>
          {breakdown.materials.length ? breakdown.materials.map((line, index) => <div className="breakdown-line" key={`${line.name}-${index}`}><span>{line.name}<small>{line.unitsUsed} {line.unitLabel} · {line.finishedPieces} piece batch · {formatMoney(line.costPerUnitMinor, currency)} / {line.unitLabel}</small></span><b>{formatMoney(line.perPieceMinor, currency)}</b></div>) : <div className="breakdown-line"><span>No material lines</span><b>{formatMoney(0, currency)}</b></div>}
          <div className="breakdown-subtotal"><span>Materials per piece</span><b>{formatMoney(breakdown.materialPerPieceMinor, currency)}</b></div>
        </div>
        <div className="breakdown-cost-group">
          <b>Printing · per finished piece</b>
          {breakdown.printing.length ? breakdown.printing.map((line, index) => <div className="breakdown-line" key={`${line.printerName}-${index}`}><span>{line.printerName}<small>{line.paperSize} · {line.quality} · {line.coverage.replaceAll("_", " ")} · {line.sheetCount} sheet(s) / {line.finishedPieces} piece(s)</small></span><b>{formatMoney(line.perPieceMinor, currency)}</b></div>) : <div className="breakdown-line"><span>No print lines</span><b>{formatMoney(0, currency)}</b></div>}
          <div className="breakdown-subtotal"><span>Printing per piece</span><b>{formatMoney(breakdown.printingPerPieceMinor, currency)}</b></div>
        </div>
        <div className="breakdown-cost-group breakdown-adjustments">
          <div className="breakdown-line"><span>Direct cost</span><b>{formatMoney(breakdown.directMinor, currency)}</b></div>
          <div className="breakdown-line"><span>Overage · {breakdown.overagePercent}%</span><b>{formatMoney(breakdown.overageMinor, currency)}</b></div>
          <div className="breakdown-line"><span>Production loss · {breakdown.lossPercent}%</span><b>{formatMoney(breakdown.lossMinor, currency)}</b></div>
          <div className="breakdown-line"><span>Operational fee</span><b>{formatMoney(breakdown.operationalFeeMinor, currency)}</b></div>
          <div className="breakdown-line"><span>Adjusted cost</span><b>{formatMoney(breakdown.adjustedMinor, currency)}</b></div>
          <div className="breakdown-line"><span>Labor · {breakdown.laborPercent}%</span><b>{formatMoney(breakdown.laborMinor, currency)}</b></div>
          <div className="breakdown-line"><span>Packaging</span><b>{formatMoney(breakdown.packagingCostMinor, currency)}</b></div>
          <div className="breakdown-production"><span>Production cost / piece</span><b>{formatMoney(breakdown.productionCostMinor, currency)}</b></div>
          <div className="breakdown-line"><span>Suggested retail / bulk</span><b>{formatMoney(breakdown.suggestedPrices.retail, currency)} / {formatMoney(breakdown.suggestedPrices.bulk, currency)}</b></div>
        </div>
      </div>
    </details>
  );
}
