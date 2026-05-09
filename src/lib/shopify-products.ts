import { shopifyAdminFetch } from "./shopify";

export type ShopifyImage = {
  url: string;
  altText: string | null;
};

export type ShopifySelectedOption = {
  name: string;
  value: string;
};

export type ShopifyVariant = {
  id: string;
  title: string;
  price: string;
  compareAtPrice: string | null;
  availableForSale: boolean;
  sku: string | null;
  selectedOptions: ShopifySelectedOption[];
  image: ShopifyImage | null;
};

export type ShopifyOption = {
  id: string;
  name: string;
  values: string[];
};

export type ShopifyProduct = {
  id: string;
  handle: string;
  title: string;
  descriptionHtml: string;
  featuredImage: ShopifyImage | null;
  images: ShopifyImage[];
  options: ShopifyOption[];
  variants: ShopifyVariant[];
};

const PRODUCT_BY_HANDLE = `
  query GetProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      handle
      title
      descriptionHtml
      featuredImage { url altText }
      images(first: 20) {
        nodes { url altText }
      }
      options {
        id
        name
        values
      }
      variants(first: 100) {
        nodes {
          id
          title
          price
          compareAtPrice
          availableForSale
          sku
          selectedOptions { name value }
          image { url altText }
        }
      }
    }
  }
`;

type RawProductByHandleResp = {
  productByHandle: {
    id: string;
    handle: string;
    title: string;
    descriptionHtml: string;
    featuredImage: ShopifyImage | null;
    images: { nodes: ShopifyImage[] };
    options: ShopifyOption[];
    variants: {
      nodes: Array<Omit<ShopifyVariant, "image"> & { image: ShopifyImage | null }>;
    };
  } | null;
};

export async function getProductByHandle(
  handle: string,
): Promise<ShopifyProduct | null> {
  const data = await shopifyAdminFetch<RawProductByHandleResp>(
    PRODUCT_BY_HANDLE,
    { handle },
    { tags: [`product:${handle}`], revalidate: 300 },
  );

  const p = data.productByHandle;
  if (!p) return null;

  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    descriptionHtml: p.descriptionHtml,
    featuredImage: p.featuredImage,
    images: p.images.nodes,
    options: p.options,
    variants: p.variants.nodes,
  };
}
