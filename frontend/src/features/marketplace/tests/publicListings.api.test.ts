import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("../../../services/api", () => ({
  api: { get, post },
}));

import {
  fetchPublicListing,
  fetchPublicListings,
  submitPublicApplication,
} from "../api/publicListings.api";
import {
  publicApplicationSchema,
  type PublicApplicationInput,
} from "../types/marketplace";

const listing = {
  id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  title: "Bright two-bedroom apartment",
  description: "Close to local services.",
  rent_amount: "725.00",
  deposit_amount: "500.00",
  available_date: "2026-12-01",
  status: "PUBLISHED",
  unit: {
    unit_number: "B-101",
    floor: 1,
    bedrooms: 2,
    bathrooms: "1.50",
    square_meters: "78.00",
    property: {
      name: "Riverside Apartments",
      address: "10 River Road",
      city: "Mogadishu",
      country: "Somalia",
    },
  },
};

const applicationResponse = {
  id: "63319499-3194-4bd1-a8be-79ab18af4caf",
  listing: listing.id,
  applicant: {
    id: "996b7f24-8762-4c08-86e4-6835ed59a5e5",
    first_name: "Amina",
    last_name: "Applicant",
    email: "amina@example.com",
    phone: "+252610000000",
    employment_status: "EMPLOYED",
    employer_name: "Example Employer",
    monthly_income: "1500.00",
    current_address: "Mogadishu",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  move_in_date: "2099-12-01",
  notes: "",
  rejection_reason: "",
  status: "SUBMITTED",
  submitted_at: "2026-01-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const applicationInput: PublicApplicationInput = {
  listing: listing.id,
  move_in_date: "2099-12-01",
  notes: "Please contact me by email.",
  applicant: {
    first_name: "Amina",
    last_name: "Applicant",
    email: "amina@example.com",
    phone: "+252610000000",
    employment_status: "EMPLOYED",
    employer_name: "Example Employer",
    monthly_income: "1500.00",
    current_address: "Mogadishu",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("public listings API", () => {
  it("requests only backend-supported public listing filters", async () => {
    get.mockResolvedValue({
      data: { count: 1, next: null, previous: null, results: [listing] },
    });

    await expect(
      fetchPublicListings({
        search: "bright",
        city: "Mogadishu",
        available_date: "2026-12-01",
        page: 2,
      }),
    ).resolves.toEqual({ count: 1, results: [listing] });

    expect(get).toHaveBeenCalledWith("listings/public/", {
      params: {
        page_size: 20,
        search: "bright",
        city: "Mogadishu",
        available_date: "2026-12-01",
        page: 2,
      },
    });
  });

  it("loads a listing from the public detail endpoint", async () => {
    get.mockResolvedValue({ data: listing });

    await expect(fetchPublicListing(listing.id)).resolves.toEqual(listing);
    expect(get).toHaveBeenCalledWith(
      `listings/public/${listing.id}/`,
    );
  });

  it("rejects public listing data that contains management fields", async () => {
    get.mockResolvedValue({
      data: { ...listing, expires_at: "2026-12-31T00:00:00Z" },
    });

    await expect(fetchPublicListing(listing.id)).rejects.toThrow();
  });

  it("submits only fields accepted by anonymous application creation", async () => {
    post.mockResolvedValue({ data: applicationResponse });

    await expect(
      submitPublicApplication(applicationInput),
    ).resolves.toMatchObject({ status: "SUBMITTED" });
    expect(post).toHaveBeenCalledWith("applications/", applicationInput);
  });

  it("validates applicant fields and a non-past move-in date", () => {
    const formValues = {
      first_name: "Amina",
      last_name: "Applicant",
      email: "amina@example.com",
      phone: "+252610000000",
      employment_status: "EMPLOYED",
      employer_name: "Example Employer",
      monthly_income: "1500.00",
      current_address: "Mogadishu",
      move_in_date: "2099-12-01",
      notes: "",
    };

    expect(publicApplicationSchema.safeParse(formValues).success).toBe(true);
    expect(
      publicApplicationSchema.safeParse({
        ...formValues,
        monthly_income: "10000000000.00",
      }).success,
    ).toBe(false);
    expect(
      publicApplicationSchema.safeParse({
        ...formValues,
        move_in_date: "2000-01-01",
      }).success,
    ).toBe(false);
  });
});
