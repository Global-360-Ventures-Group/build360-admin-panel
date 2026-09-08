"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload, isValidImageSrc } from "@/components/shared/image-upload";
import { formatCurrency, slugify } from "@/lib/utils";

import { mockBrands } from "@/features/brands/data";
import { mockCategories } from "@/features/categories/data";
import { getPathLabel } from "@/features/categories/types";

import { DeleteProductDialog } from "./delete-product-dialog";
import { useProducts } from "./products-store";
import {
  NONE,
  emptyProductForm,
  getDiscountPercent,
  getMarginPercent,
  productStatusLabels,
  suggestSku,
  unitOptions,
  type Product,
  type ProductFormValues,
  type ProductStatus,
} from "./types";

type FormErrors = Partial<Record<keyof ProductFormValues, string>>;

const statusItems = (
  Object.keys(productStatusLabels) as ProductStatus[]
).map((s) => ({ value: s, label: productStatusLabels[s] }));

const unitItems = unitOptions.map((u) => ({ value: u, label: u }));

function validate(
  values: ProductFormValues,
  takenSlugs: string[],
  takenSkus: string[],
): FormErrors {
  const errors: FormErrors = {};
  const name = values.name.trim();
  const slug = values.slug.trim();
  const sku = values.sku.trim();

  if (!name) errors.name = "Product name is required.";
  else if (name.length < 3) errors.name = "Name must be at least 3 characters.";
  else if (name.length > 120)
    errors.name = "Name must be 120 characters or less.";

  if (!slug) errors.slug = "Slug is required.";
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    errors.slug = "Use lowercase letters, numbers and hyphens only.";
  else if (takenSlugs.includes(slug))
    errors.slug = "This slug is already in use.";

  if (!sku) errors.sku = "SKU is required.";
  else if (!/^[A-Za-z0-9._-]+$/.test(sku))
    errors.sku = "Use letters, numbers, dots, hyphens or underscores.";
  else if (takenSkus.includes(sku.toUpperCase()))
    errors.sku = "This SKU is already in use.";

  if (!Number.isFinite(values.price)) errors.price = "Enter a price.";
  else if (values.price < 0) errors.price = "Price cannot be negative.";

  if (values.compareAtPrice != null) {
    if (!Number.isFinite(values.compareAtPrice))
      errors.compareAtPrice = "Enter a number.";
    else if (values.compareAtPrice < 0)
      errors.compareAtPrice = "Cannot be negative.";
    else if (values.compareAtPrice <= values.price)
      errors.compareAtPrice = "Must be higher than the price to show a discount.";
  }

  if (values.costPrice != null) {
    if (!Number.isFinite(values.costPrice))
      errors.costPrice = "Enter a number.";
    else if (values.costPrice < 0) errors.costPrice = "Cannot be negative.";
  }

  if (!Number.isFinite(values.stock)) errors.stock = "Enter a quantity.";
  else if (values.stock < 0) errors.stock = "Stock cannot be negative.";
  else if (!Number.isInteger(values.stock))
    errors.stock = "Stock must be a whole number.";

  if (!Number.isFinite(values.lowStockThreshold))
    errors.lowStockThreshold = "Enter a number.";
  else if (values.lowStockThreshold < 0)
    errors.lowStockThreshold = "Cannot be negative.";

  if (values.imageUrl.trim() && !isValidImageSrc(values.imageUrl.trim()))
    errors.imageUrl = "Upload an image or enter a valid image URL.";

  if (values.description.length > 1000)
    errors.description = "Description must be 1000 characters or less.";

  return errors;
}

function toFormValues(product?: Product | null): ProductFormValues {
  if (!product) return emptyProductForm;
  return {
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    description: product.description ?? "",
    brandId: product.brandId,
    categoryId: product.categoryId,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    costPrice: product.costPrice,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    unit: product.unit,
    imageUrl: product.imageUrl ?? "",
    status: product.status,
    featured: product.featured,
  };
}

/** Reads an optional number input; empty means "not set" (null). */
function optionalNumber(input: HTMLInputElement): number | null {
  return input.value === "" ? null : input.valueAsNumber;
}

export function ProductForm({ product }: { product?: Product | null }) {
  const router = useRouter();
  const { products, create, update, remove } = useProducts();
  const isEdit = Boolean(product);

  const [values, setValues] = React.useState<ProductFormValues>(() =>
    toFormValues(product),
  );
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [slugTouched, setSlugTouched] = React.useState(isEdit);
  const [skuTouched, setSkuTouched] = React.useState(isEdit);
  const [submitting, setSubmitting] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const brandItems = React.useMemo(
    () => [
      { value: NONE, label: "No brand" },
      ...[...mockBrands]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((b) => ({ value: b.id, label: b.name })),
    ],
    [],
  );

  const categoryItems = React.useMemo(
    () => [
      { value: NONE, label: "Uncategorized" },
      ...mockCategories
        .map((c) => ({
          value: c.id,
          label: getPathLabel(mockCategories, c.id),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ],
    [],
  );

  const set =
    <K extends keyof ProductFormValues>(key: K) =>
    (value: ProductFormValues[K]) => {
      setValues((v) => ({ ...v, [key]: value }));
      setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
    };

  function handleNameChange(name: string) {
    setValues((v) => ({
      ...v,
      name,
      slug: slugTouched ? v.slug : slugify(name),
      sku: skuTouched ? v.sku : suggestSku(name),
    }));
    setErrors((e) =>
      e.name || e.slug || e.sku
        ? { ...e, name: undefined, slug: undefined, sku: undefined }
        : e,
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const others = products.filter((p) => p.id !== product?.id);
    const nextErrors = validate(
      values,
      others.map((p) => p.slug),
      others.map((p) => p.sku.toUpperCase()),
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    const payload: ProductFormValues = {
      ...values,
      name: values.name.trim(),
      slug: values.slug.trim(),
      sku: values.sku.trim(),
      description: values.description.trim(),
      imageUrl: values.imageUrl.trim(),
    };

    setSubmitting(true);
    try {
      if (product) {
        await update(product.id, payload);
        toast.success("Product updated", { description: payload.name });
      } else {
        await create(payload);
        toast.success("Product created", { description: payload.name });
      }
      router.push("/products");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!product) return;
    await remove([product.id]);
    toast.success("Product deleted", { description: product.name });
    router.push("/products");
  }

  const discount = getDiscountPercent(values);
  const margin = getMarginPercent(values);
  const profit =
    values.costPrice != null && Number.isFinite(values.price)
      ? values.price - values.costPrice
      : null;

  return (
    <>
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 size-8 shrink-0"
            aria-label="Back to products"
            render={<Link href="/products" />}
          >
            <ArrowLeft />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {isEdit ? product!.name : "New product"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEdit
                ? `SKU ${product!.sku}`
                : "Add a product to your catalog."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {isEdit && (
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              disabled={submitting}
            >
              <Trash2 /> Delete
            </Button>
          )}
          <Button type="submit" form="product-form" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            {isEdit ? "Save changes" : "Create product"}
          </Button>
        </div>
      </div>

      <form
        id="product-form"
        onSubmit={handleSubmit}
        noValidate
        className="grid gap-4 lg:grid-cols-3 lg:items-start"
      >
        {/* ── Main column ──────────────────────────────────────────────── */}
        <div className="grid gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Basics</CardTitle>
              <CardDescription>
                Name, identifiers and the customer-facing description.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={Boolean(errors.name) || undefined}>
                  <FieldLabel htmlFor="product-name">
                    Name <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="product-name"
                    value={values.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. BSRM Deformed Bar 12mm"
                    aria-invalid={Boolean(errors.name) || undefined}
                    autoFocus={!isEdit}
                  />
                  <FieldError>{errors.name}</FieldError>
                </Field>

                <div className="grid gap-6 sm:grid-cols-2">
                  <Field data-invalid={Boolean(errors.slug) || undefined}>
                    <FieldLabel htmlFor="product-slug">
                      Slug <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="product-slug"
                      value={values.slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        set("slug")(e.target.value);
                      }}
                      className="font-mono"
                      placeholder="bsrm-deformed-bar-12mm"
                      aria-invalid={Boolean(errors.slug) || undefined}
                    />
                    <FieldDescription>Auto-filled from the name.</FieldDescription>
                    <FieldError>{errors.slug}</FieldError>
                  </Field>

                  <Field data-invalid={Boolean(errors.sku) || undefined}>
                    <FieldLabel htmlFor="product-sku">
                      SKU <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="product-sku"
                      value={values.sku}
                      onChange={(e) => {
                        setSkuTouched(true);
                        set("sku")(e.target.value);
                      }}
                      className="font-mono"
                      placeholder="BSRM-DB-12"
                      aria-invalid={Boolean(errors.sku) || undefined}
                    />
                    <FieldDescription>Must be unique.</FieldDescription>
                    <FieldError>{errors.sku}</FieldError>
                  </Field>
                </div>

                <Field data-invalid={Boolean(errors.description) || undefined}>
                  <FieldLabel htmlFor="product-description">
                    Description
                  </FieldLabel>
                  <Textarea
                    id="product-description"
                    value={values.description}
                    onChange={(e) => set("description")(e.target.value)}
                    placeholder="Describe the product for customers"
                    rows={5}
                    aria-invalid={Boolean(errors.description) || undefined}
                  />
                  <FieldDescription className="text-right tabular-nums">
                    {values.description.length}/1000
                  </FieldDescription>
                  <FieldError>{errors.description}</FieldError>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>
                All amounts are in BDT (৳).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-6 sm:grid-cols-3">
                  <Field data-invalid={Boolean(errors.price) || undefined}>
                    <FieldLabel htmlFor="product-price">
                      Price <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="product-price"
                      type="number"
                      min={0}
                      step="1"
                      value={Number.isFinite(values.price) ? values.price : ""}
                      onChange={(e) => set("price")(e.target.valueAsNumber)}
                      aria-invalid={Boolean(errors.price) || undefined}
                    />
                    <FieldError>{errors.price}</FieldError>
                  </Field>

                  <Field data-invalid={Boolean(errors.compareAtPrice) || undefined}>
                    <FieldLabel htmlFor="product-compare">Compare at</FieldLabel>
                    <Input
                      id="product-compare"
                      type="number"
                      min={0}
                      step="1"
                      value={values.compareAtPrice ?? ""}
                      onChange={(e) =>
                        set("compareAtPrice")(optionalNumber(e.currentTarget))
                      }
                      placeholder="Optional"
                      aria-invalid={Boolean(errors.compareAtPrice) || undefined}
                    />
                    <FieldDescription>Shown struck through.</FieldDescription>
                    <FieldError>{errors.compareAtPrice}</FieldError>
                  </Field>

                  <Field data-invalid={Boolean(errors.costPrice) || undefined}>
                    <FieldLabel htmlFor="product-cost">Cost</FieldLabel>
                    <Input
                      id="product-cost"
                      type="number"
                      min={0}
                      step="1"
                      value={values.costPrice ?? ""}
                      onChange={(e) =>
                        set("costPrice")(optionalNumber(e.currentTarget))
                      }
                      placeholder="Optional"
                      aria-invalid={Boolean(errors.costPrice) || undefined}
                    />
                    <FieldDescription>Not shown to customers.</FieldDescription>
                    <FieldError>{errors.costPrice}</FieldError>
                  </Field>
                </div>

                {(discount !== null || margin !== null) && (
                  <div className="flex flex-wrap gap-4 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                    {discount !== null && (
                      <span>
                        Discount:{" "}
                        <span className="font-medium tabular-nums">
                          {discount}%
                        </span>
                      </span>
                    )}
                    {margin !== null && profit !== null && (
                      <span>
                        Margin:{" "}
                        <span
                          className={
                            margin >= 0
                              ? "font-medium tabular-nums text-success"
                              : "font-medium tabular-nums text-destructive"
                          }
                        >
                          {margin}% ({formatCurrency(profit)})
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
              <CardDescription>
                Stock on hand and the low-stock warning level.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-6 sm:grid-cols-3">
                  <Field data-invalid={Boolean(errors.stock) || undefined}>
                    <FieldLabel htmlFor="product-stock">Stock</FieldLabel>
                    <Input
                      id="product-stock"
                      type="number"
                      min={0}
                      step="1"
                      value={Number.isFinite(values.stock) ? values.stock : ""}
                      onChange={(e) => set("stock")(e.target.valueAsNumber)}
                      aria-invalid={Boolean(errors.stock) || undefined}
                    />
                    <FieldError>{errors.stock}</FieldError>
                  </Field>

                  <Field
                    data-invalid={Boolean(errors.lowStockThreshold) || undefined}
                  >
                    <FieldLabel htmlFor="product-low">Low stock at</FieldLabel>
                    <Input
                      id="product-low"
                      type="number"
                      min={0}
                      step="1"
                      value={
                        Number.isFinite(values.lowStockThreshold)
                          ? values.lowStockThreshold
                          : ""
                      }
                      onChange={(e) =>
                        set("lowStockThreshold")(e.target.valueAsNumber)
                      }
                      aria-invalid={
                        Boolean(errors.lowStockThreshold) || undefined
                      }
                    />
                    <FieldDescription>Warn at or below this.</FieldDescription>
                    <FieldError>{errors.lowStockThreshold}</FieldError>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="product-unit">Unit</FieldLabel>
                    <Select
                      value={values.unit}
                      onValueChange={(v) => set("unit")(String(v ?? "pcs"))}
                      items={unitItems}
                    >
                      <SelectTrigger id="product-unit" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {unitItems.map((it) => (
                          <SelectItem key={it.value} value={it.value}>
                            {it.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>

        {/* ── Side column ──────────────────────────────────────────────── */}
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="product-status">Visibility</FieldLabel>
                  <Select
                    value={values.status}
                    onValueChange={(v) =>
                      set("status")((v as ProductStatus) ?? "draft")
                    }
                    items={statusItems}
                  >
                    <SelectTrigger id="product-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusItems.map((it) => (
                        <SelectItem key={it.value} value={it.value}>
                          {it.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Only active products appear in the storefront.
                  </FieldDescription>
                </Field>

                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="product-featured">Featured</FieldLabel>
                    <FieldDescription>
                      Highlight on the home page.
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id="product-featured"
                    checked={values.featured}
                    onCheckedChange={(checked) => set("featured")(checked)}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="product-brand">Brand</FieldLabel>
                  <Select
                    value={values.brandId ?? NONE}
                    onValueChange={(v) =>
                      set("brandId")(v === NONE || v == null ? null : String(v))
                    }
                    items={brandItems}
                  >
                    <SelectTrigger id="product-brand" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {brandItems.map((it) => (
                        <SelectItem key={it.value} value={it.value}>
                          {it.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="product-category">Category</FieldLabel>
                  <Select
                    value={values.categoryId ?? NONE}
                    onValueChange={(v) =>
                      set("categoryId")(
                        v === NONE || v == null ? null : String(v),
                      )
                    }
                    items={categoryItems}
                  >
                    <SelectTrigger id="product-category" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {categoryItems.map((it) => (
                        <SelectItem key={it.value} value={it.value}>
                          {it.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Media</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={Boolean(errors.imageUrl) || undefined}>
                  <FieldLabel htmlFor="product-image">Product image</FieldLabel>
                  <ImageUpload
                    id="product-image"
                    value={values.imageUrl}
                    onChange={(url) => set("imageUrl")(url)}
                    onError={(message) =>
                      setErrors((e) => ({ ...e, imageUrl: message ?? undefined }))
                    }
                    disabled={submitting}
                  />
                  <FieldError>{errors.imageUrl}</FieldError>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          {isEdit && (
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Current price</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(product!.price)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="capitalize">
                    {productStatusLabels[product!.status]}
                  </Badge>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Product ID</span>
                  <span className="font-mono text-xs">{product!.id}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </form>

      {/* Sticky footer actions on small screens */}
      <div className="flex justify-end gap-2 lg:hidden">
        <Button variant="outline" render={<Link href="/products" />}>
          Cancel
        </Button>
        <Button type="submit" form="product-form" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          {isEdit ? "Save changes" : "Create product"}
        </Button>
      </div>

      {product && (
        <DeleteProductDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          count={1}
          label={product.name}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
