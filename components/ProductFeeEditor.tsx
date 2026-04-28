"use client";
import type { ProductFee } from "@/lib/schema";
import { Button, NumberInput, TextInput } from "./ui";

export function ProductFeeEditor({
  value,
  onChange,
}: {
  value: ProductFee;
  onChange: (next: ProductFee) => void;
}) {
  const productKeys = Object.keys(value);

  function setProductKey(oldKey: string, newKey: string) {
    if (newKey === oldKey || !newKey) return;
    const next: ProductFee = {};
    for (const k of productKeys) {
      next[k === oldKey ? newKey : k] = value[k];
    }
    onChange(next);
  }
  function removeProduct(k: string) {
    const next: ProductFee = {};
    for (const key of productKeys) if (key !== k) next[key] = value[key];
    onChange(next);
  }
  function addProduct() {
    let key = "new-product";
    let i = 1;
    while (key in value) key = `new-product-${i++}`;
    onChange({ ...value, [key]: {} });
  }

  function setCountryKey(productKey: string, oldC: string, newC: string) {
    if (newC === oldC || !newC) return;
    const country = value[productKey];
    const next: typeof country = {};
    for (const c of Object.keys(country)) next[c === oldC ? newC : c] = country[c];
    onChange({ ...value, [productKey]: next });
  }
  function removeCountry(productKey: string, c: string) {
    const country = value[productKey];
    const next: typeof country = {};
    for (const k of Object.keys(country)) if (k !== c) next[k] = country[k];
    onChange({ ...value, [productKey]: next });
  }
  function addCountry(productKey: string) {
    onChange({ ...value, [productKey]: { ...value[productKey], XX: { Default: { Amount: 0, Currency: "USD" } } } });
  }

  function setSegment(
    productKey: string,
    countryKey: string,
    seg: string,
    field: "Amount" | "Currency",
    fieldValue: number | string
  ) {
    const country = value[productKey];
    const segments = country[countryKey];
    const updated = {
      ...segments,
      [seg]: { ...segments[seg], [field]: fieldValue },
    };
    onChange({ ...value, [productKey]: { ...country, [countryKey]: updated } });
  }

  function setSegmentName(productKey: string, countryKey: string, oldSeg: string, newSeg: string) {
    if (newSeg === oldSeg || !newSeg) return;
    const segments = value[productKey][countryKey];
    const next: typeof segments = {};
    for (const s of Object.keys(segments)) next[s === oldSeg ? newSeg : s] = segments[s];
    onChange({ ...value, [productKey]: { ...value[productKey], [countryKey]: next } });
  }

  function removeSegment(productKey: string, countryKey: string, seg: string) {
    const segments = value[productKey][countryKey];
    const next: typeof segments = {};
    for (const s of Object.keys(segments)) if (s !== seg) next[s] = segments[s];
    onChange({ ...value, [productKey]: { ...value[productKey], [countryKey]: next } });
  }

  function addSegment(productKey: string, countryKey: string) {
    const segments = value[productKey][countryKey] || {};
    let name = "Default";
    let i = 1;
    while (name in segments) name = `Default-${i++}`;
    onChange({
      ...value,
      [productKey]: {
        ...value[productKey],
        [countryKey]: { ...segments, [name]: { Amount: 0, Currency: "USD" } },
      },
    });
  }

  if (productKeys.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-line bg-slate-50 p-4 text-sm text-subtle">
        <p className="mb-2">No fixed product fees configured.</p>
        <Button onClick={addProduct}>+ Add product</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {productKeys.map((pk) => (
        <div key={pk} className="rounded-md border border-line bg-slate-50/40 p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-subtle">Product key</span>
            <TextInput
              value={pk}
              onChange={(v) => setProductKey(pk, v)}
              className="!w-44"
              placeholder="e.g. 2|4|8"
            />
            <div className="ml-auto">
              <Button variant="ghost" onClick={() => removeProduct(pk)}>
                Remove product
              </Button>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {Object.keys(value[pk]).map((cc) => (
              <div key={cc} className="rounded border border-line bg-white p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-subtle">Country</span>
                  <TextInput
                    value={cc}
                    onChange={(v) => setCountryKey(pk, cc, v.toUpperCase())}
                    className="!w-24"
                    placeholder="ISO2"
                  />
                  <div className="ml-auto">
                    <Button variant="ghost" onClick={() => removeCountry(pk, cc)}>
                      Remove
                    </Button>
                  </div>
                </div>
                <div className="mt-2 space-y-1.5">
                  {Object.keys(value[pk][cc]).map((seg) => {
                    const v = value[pk][cc][seg];
                    return (
                      <div key={seg} className="grid grid-cols-12 items-center gap-2">
                        <TextInput
                          value={seg}
                          onChange={(name) => setSegmentName(pk, cc, seg, name)}
                          className="col-span-4"
                          placeholder="segment (e.g. Default)"
                        />
                        <NumberInput
                          value={v.Amount}
                          onChange={(n) => setSegment(pk, cc, seg, "Amount", n ?? 0)}
                          className="col-span-3"
                          placeholder="Amount"
                        />
                        <TextInput
                          value={v.Currency}
                          onChange={(c) => setSegment(pk, cc, seg, "Currency", c.toUpperCase())}
                          className="col-span-3"
                          placeholder="USD"
                        />
                        <div className="col-span-2 text-right">
                          <Button variant="ghost" onClick={() => removeSegment(pk, cc, seg)}>
                            ✕
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  <Button onClick={() => addSegment(pk, cc)}>+ Add segment</Button>
                </div>
              </div>
            ))}
            <Button onClick={() => addCountry(pk)}>+ Add country</Button>
          </div>
        </div>
      ))}
      <Button onClick={addProduct}>+ Add product</Button>
    </div>
  );
}
