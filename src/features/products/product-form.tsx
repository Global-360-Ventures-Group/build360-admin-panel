"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
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
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, slugify } from "@/lib/utils";

import { saveProductAction } from "./actions";
import { CategoryPicker } from "./category-picker";
import type { BrandOption, CategoryOption } from "./product-options";
import {
  KNOWN_UNITS,
  PRODUCT_LIMITS,
  PRODUCT_STATUSES,
  marginPercent,
  productStatusLabels,
  suggestSku,
  type Product,
} from "./types";

/**
 * The product create/edit form.
 *
 * Two API shapes drive the layout:
 *
 * - `status` is only accepted on update, so the status control is absent when
 *   creating — a new product is always ACTIVE.
 * - `images` are only accepted on create, and there is no way to attach a file
 *   before the product has an id. So creating is a two-step flow: save, then
 *   land on the editor where the gallery lives.
 *
 * `rating` and `reviewCount` come back from the API but `PUT` documents that it
 * never changes them, so they are displayed read-only rather than as inputs.
 */
export function ProductForm({
  product,
  brands,
  categories,
}: {
  product?: Product | null;
  brands: BrandOption[];
  categories: CategoryOption[];
}) {
  const isEdit = Boolean(product);
  const router = useRouter();

  const [state, formAction, pending] = React.useActionState(
    saveProductAction,
    undefined,
  );

  const [name, setName] = React.useState(product?.name ?? "");
  const [slug, setSlug] = React.useState(product?.slug ?? "");
  const [sku, setSku] = React.useState(product?.sku ?? "");
  const [slugTouched, setSlugTouched] = React.useState(isEdit);
  const [skuTouched, setSkuTouched] = React.useState(isEdit);

  const [brandId, setBrandId] = React.useState(product?.brandId ?? "");
  const [categoryId, setCategoryId] = React.useState(product?.categoryId ?? "");
  const [unit, setUnit] = React.useState(product?.unit ?? "");
  const [status, setStatus] = React.useState(product?.status ?? "ACTIVE");

  const [price, setPrice] = React.useState(
    product ? String(product.price) : "",
  );
  const [costPrice, setCostPrice] = React.useState(
    product?.costPrice != null ? String(product.costPrice) : "",
  );

  const settled = React.useRef(false);
  React.useEffect(() => {
    if (state?.status !== "success" || settled.current) return;

    settled.current = true;
    toast.success(state.message ?? "Saved.");

    // A new product needs its editor to attach images; an edit stays put.
    if (state.createdId) router.push(`/products/${state.createdId}/edit`);
    else router.refresh();
  }, [state, router]);

  const fieldErrors = state?.fieldErrors;
  const busy = pending;

  const margin = marginPercent({
    price: Number(price) || 0,
    costPrice: costPrice === "" ? null : Number(costPrice),
  });

  // Archived options stay listed: an existing product may already point at
  // one, and silently dropping it would reassign the product on save.
  const brandItems = brands.map((brand) => ({
    value: brand.id,
    label: brand.active ? brand.name : `${brand.name} (archived)`,
  }));
  // Shown under the picker so the chosen branch is readable at a glance —
  // the selects themselves only ever show one level's name.
  const selectedCategory = categories.find(
    (category) => category.id === categoryId,
  );
  const statusItems = PRODUCT_STATUSES.map((value) => ({
    value,
    label: productStatusLabels[value],
  }));

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <input type="hidden" name="brandId" value={brandId} />
      <input type="hidden" name="categoryId" value={categoryId} />
      {isEdit ? <input type="hidden" name="status" value={status} /> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0"
            render={<Link href="/products" />}
            aria-label="Back to products"
          >
            <ArrowLeft />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {isEdit ? product?.name : "New product"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEdit
                ? "Update the product details below."
                : "Create the product, then add its images."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" render={<Link href="/products" />}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {isEdit ? "Save changes" : "Create product"}
          </Button>
        </div>
      </div>

      {state?.status === "error" && state.message ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Basics</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={Boolean(fieldErrors?.name) || undefined}>
                  <FieldLabel htmlFor="product-name">
                    Name <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="product-name"
                    name="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!slugTouched) setSlug(slugify(e.target.value));
                      if (!skuTouched) setSku(suggestSku(e.target.value));
                    }}
                    placeholder="e.g. Akij Cement OPC 50KG"
                    maxLength={PRODUCT_LIMITS.name}
                    aria-invalid={Boolean(fieldErrors?.name) || undefined}
                    disabled={busy}
                    autoFocus={!isEdit}
                  />
                  <FieldError>{fieldErrors?.name}</FieldError>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={Boolean(fieldErrors?.sku) || undefined}>
                    <FieldLabel htmlFor="product-sku">SKU</FieldLabel>
                    <Input
                      id="product-sku"
                      name="sku"
                      value={sku}
                      onChange={(e) => {
                        setSkuTouched(true);
                        setSku(e.target.value);
                      }}
                      placeholder="AKIJ-OPC-50"
                      className="font-mono"
                      maxLength={PRODUCT_LIMITS.sku}
                      aria-invalid={Boolean(fieldErrors?.sku) || undefined}
                      disabled={busy}
                    />
                    <FieldDescription>
                      Generated by the API when left blank.
                    </FieldDescription>
                    <FieldError>{fieldErrors?.sku}</FieldError>
                  </Field>

                  <Field data-invalid={Boolean(fieldErrors?.slug) || undefined}>
                    <FieldLabel htmlFor="product-slug">Slug</FieldLabel>
                    <Input
                      id="product-slug"
                      name="slug"
                      value={slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setSlug(e.target.value);
                      }}
                      placeholder="akij-cement-opc-50kg"
                      className="font-mono"
                      maxLength={PRODUCT_LIMITS.slug}
                      aria-invalid={Boolean(fieldErrors?.slug) || undefined}
                      disabled={busy}
                    />
                    <FieldDescription>Derived from the name if blank.</FieldDescription>
                    <FieldError>{fieldErrors?.slug}</FieldError>
                  </Field>
                </div>

                <Field
                  data-invalid={Boolean(fieldErrors?.shortDescription) || undefined}
                >
                  <FieldLabel htmlFor="product-short-description">
                    Short description
                  </FieldLabel>
                  <Textarea
                    id="product-short-description"
                    name="shortDescription"
                    defaultValue={product?.shortDescription ?? ""}
                    rows={2}
                    maxLength={PRODUCT_LIMITS.shortDescription}
                    placeholder="One or two lines for listings and search results."
                    aria-invalid={
                      Boolean(fieldErrors?.shortDescription) || undefined
                    }
                    disabled={busy}
                  />
                  <FieldError>{fieldErrors?.shortDescription}</FieldError>
                </Field>

                <Field data-invalid={Boolean(fieldErrors?.description) || undefined}>
                  <FieldLabel htmlFor="product-description">Description</FieldLabel>
                  <Textarea
                    id="product-description"
                    name="description"
                    defaultValue={product?.description ?? ""}
                    rows={6}
                    maxLength={PRODUCT_LIMITS.description}
                    placeholder="Full product description."
                    aria-invalid={Boolean(fieldErrors?.description) || undefined}
                    disabled={busy}
                  />
                  <FieldError>{fieldErrors?.description}</FieldError>
                </Field>

                <Field data-invalid={Boolean(fieldErrors?.specification) || undefined}>
                  <FieldLabel htmlFor="product-specification">
                    Specification
                  </FieldLabel>
                  <Textarea
                    id="product-specification"
                    name="specification"
                    defaultValue={product?.specification ?? ""}
                    rows={5}
                    maxLength={PRODUCT_LIMITS.specification}
                    placeholder="Technical details, grades, dimensions."
                    aria-invalid={Boolean(fieldErrors?.specification) || undefined}
                    disabled={busy}
                  />
                  <FieldError>{fieldErrors?.specification}</FieldError>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field data-invalid={Boolean(fieldErrors?.price) || undefined}>
                    <FieldLabel htmlFor="product-price">
                      Price <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="product-price"
                      name="price"
                      type="number"
                      min={0}
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="tabular-nums"
                      aria-invalid={Boolean(fieldErrors?.price) || undefined}
                      disabled={busy}
                    />
                    <FieldError>{fieldErrors?.price}</FieldError>
                  </Field>

                  <Field data-invalid={Boolean(fieldErrors?.costPrice) || undefined}>
                    <FieldLabel htmlFor="product-cost-price">Cost price</FieldLabel>
                    <Input
                      id="product-cost-price"
                      name="costPrice"
                      type="number"
                      min={0}
                      step="0.01"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      className="tabular-nums"
                      aria-invalid={Boolean(fieldErrors?.costPrice) || undefined}
                      disabled={busy}
                    />
                    <FieldDescription>
                      {margin !== null ? (
                        <span
                          className={margin >= 0 ? "text-success" : "text-destructive"}
                        >
                          {margin}% margin
                        </span>
                      ) : (
                        "Leave blank if not tracked."
                      )}
                    </FieldDescription>
                    <FieldError>{fieldErrors?.costPrice}</FieldError>
                  </Field>

                  <Field
                    data-invalid={Boolean(fieldErrors?.discountPrice) || undefined}
                  >
                    <FieldLabel htmlFor="product-discount-price">
                      Discount price
                    </FieldLabel>
                    <Input
                      id="product-discount-price"
                      name="discountPrice"
                      type="number"
                      min={0}
                      step="0.01"
                      defaultValue={
                        product?.discountPrice != null
                          ? String(product.discountPrice)
                          : ""
                      }
                      className="tabular-nums"
                      aria-invalid={
                        Boolean(fieldErrors?.discountPrice) || undefined
                      }
                      disabled={busy}
                    />
                    <FieldDescription>
                      The promotional price, below the regular one.
                    </FieldDescription>
                    <FieldError>{fieldErrors?.discountPrice}</FieldError>
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={Boolean(fieldErrors?.manufacturer) || undefined}>
                  <FieldLabel htmlFor="product-manufacturer">Manufacturer</FieldLabel>
                  <Textarea
                    id="product-manufacturer"
                    name="manufacturer"
                    defaultValue={product?.manufacturer ?? ""}
                    rows={2}
                    maxLength={PRODUCT_LIMITS.manufacturer}
                    aria-invalid={Boolean(fieldErrors?.manufacturer) || undefined}
                    disabled={busy}
                  />
                  <FieldError>{fieldErrors?.manufacturer}</FieldError>
                </Field>

                <Field
                  data-invalid={Boolean(fieldErrors?.refundReturnPolicy) || undefined}
                >
                  <FieldLabel htmlFor="product-refund-policy">
                    Refund & return policy
                  </FieldLabel>
                  <Textarea
                    id="product-refund-policy"
                    name="refundReturnPolicy"
                    defaultValue={product?.refundReturnPolicy ?? ""}
                    rows={4}
                    maxLength={PRODUCT_LIMITS.refundReturnPolicy}
                    aria-invalid={
                      Boolean(fieldErrors?.refundReturnPolicy) || undefined
                    }
                    disabled={busy}
                  />
                  <FieldError>{fieldErrors?.refundReturnPolicy}</FieldError>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Organisation</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={Boolean(fieldErrors?.brandId) || undefined}>
                  <FieldLabel htmlFor="product-brand">
                    Brand <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select
                    value={brandId}
                    onValueChange={(value) => setBrandId(value ?? "")}
                    items={brandItems}
                    disabled={busy}
                  >
                    <SelectTrigger
                      id="product-brand"
                      className="w-full"
                      aria-label="Brand"
                    >
                      <SelectValue placeholder="Select a brand" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {brandItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{fieldErrors?.brandId}</FieldError>
                </Field>

                <Field data-invalid={Boolean(fieldErrors?.categoryId) || undefined}>
                  <FieldLabel htmlFor="product-category">
                    Category <span className="text-destructive">*</span>
                  </FieldLabel>
                  <div className="flex flex-col gap-2">
                    <CategoryPicker
                      id="product-category"
                      categories={categories}
                      value={categoryId}
                      onValueChange={setCategoryId}
                      placeholder="Select a base category"
                      invalid={Boolean(fieldErrors?.categoryId)}
                      disabled={busy}
                    />
                  </div>
                  <FieldDescription>
                    {selectedCategory
                      ? `Filed under ${selectedCategory.path}.`
                      : "Pick a base category, then a subcategory if it has any."}{" "}
                    Both the brand and category must be active for a new product.
                  </FieldDescription>
                  <FieldError>{fieldErrors?.categoryId}</FieldError>
                </Field>

                {isEdit ? (
                  <Field>
                    <FieldLabel htmlFor="product-status">Status</FieldLabel>
                    <Select
                      value={status}
                      onValueChange={(value) =>
                        setStatus((value as typeof status) ?? "ACTIVE")
                      }
                      items={statusItems}
                      disabled={busy}
                    >
                      <SelectTrigger
                        id="product-status"
                        className="w-full"
                        aria-label="Status"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Out of stock hides the buy action; discontinued retires the
                      product.
                    </FieldDescription>
                  </Field>
                ) : (
                  <FieldDescription>
                    New products are created active. The status becomes editable
                    once saved.
                  </FieldDescription>
                )}

                <Field>
                  <FieldLabel className="cursor-pointer" htmlFor="product-featured">Featured</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="product-featured"
                      name="featured"
                      defaultChecked={product?.featured ?? false}
                      disabled={busy}
                    />
                    <span className="text-sm text-muted-foreground">
                      Highlight this product on the storefront
                    </span>
                  </div>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Units & shipping</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={Boolean(fieldErrors?.unit) || undefined}>
                  <FieldLabel htmlFor="product-unit">
                    Unit <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="product-unit"
                    name="unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value.toUpperCase())}
                    list="product-unit-options"
                    placeholder="BAG"
                    maxLength={PRODUCT_LIMITS.unit}
                    aria-invalid={Boolean(fieldErrors?.unit) || undefined}
                    disabled={busy}
                  />
                  {/* Suggestions, not a constraint: the API takes any string
                      up to 50 characters, so a <Select> would reject values
                      the API accepts. */}
                  <datalist id="product-unit-options">
                    {KNOWN_UNITS.map((known) => (
                      <option key={known} value={known} />
                    ))}
                  </datalist>
                  <FieldDescription>
                    How the product is sold. Existing catalog uses{" "}
                    {KNOWN_UNITS.slice(0, 4).join(", ")} and others.
                  </FieldDescription>
                  <FieldError>{fieldErrors?.unit}</FieldError>
                </Field>

                <Field
                  data-invalid={
                    Boolean(fieldErrors?.minimumOrderQuantity) || undefined
                  }
                >
                  <FieldLabel htmlFor="product-moq">
                    Minimum order quantity{" "}
                    <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="product-moq"
                    name="minimumOrderQuantity"
                    type="number"
                    min={1}
                    step="1"
                    defaultValue={
                      product ? String(product.minimumOrderQuantity) : "1"
                    }
                    className="tabular-nums"
                    aria-invalid={
                      Boolean(fieldErrors?.minimumOrderQuantity) || undefined
                    }
                    disabled={busy}
                  />
                  <FieldError>{fieldErrors?.minimumOrderQuantity}</FieldError>
                </Field>

                <Field data-invalid={Boolean(fieldErrors?.weight) || undefined}>
                  <FieldLabel htmlFor="product-weight">Weight (kg)</FieldLabel>
                  <Input
                    id="product-weight"
                    name="weight"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={
                      product?.weight != null ? String(product.weight) : ""
                    }
                    className="tabular-nums"
                    aria-invalid={Boolean(fieldErrors?.weight) || undefined}
                    disabled={busy}
                  />
                  <FieldError>{fieldErrors?.weight}</FieldError>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          {isEdit && product ? (
            <Card>
              <CardHeader>
                <CardTitle>Reviews</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {/* Read-only: PUT documents that it never changes these. */}
                <div className="flex items-center gap-2">
                  <Star className="size-4 fill-primary text-primary" />
                  <span className="font-medium tabular-nums">
                    {product.rating != null ? product.rating.toFixed(1) : "—"}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    from {product.reviewCount} review
                    {product.reviewCount === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Set by customer reviews and not editable here.
                </p>
                {product.discountPrice != null ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Customers currently pay{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {formatCurrency(product.discountPrice)}
                    </span>
                    .
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </form>
  );
}
