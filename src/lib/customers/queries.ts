export type {
  OwnerRecord as CustomerRecord,
  OwnerOption as CustomerOption,
} from "@/lib/owners/types";

export {
  listOwners as listCustomers,
  getOwner as getCustomer,
  listOwnerOptions as listCustomerOptions,
} from "@/lib/owners/queries";
