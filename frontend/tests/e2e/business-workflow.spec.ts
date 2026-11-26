import { expect, test, type Page } from "@playwright/test";

function dateOffset(days: number): string {
  const date = new Date(`${process.env.E2E_TODAY ?? new Date().toISOString().slice(0, 10)}T12:00:00Z`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function firstOfCurrentMonth(): string {
  const date = new Date(`${process.env.E2E_TODAY ?? new Date().toISOString().slice(0, 10)}T12:00:00Z`);
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const loginResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/auth/login/"),
  );
  await page.getByRole("button", { name: "Sign in" }).click();
  const loginResponse = await loginResponsePromise;
  expect(
    loginResponse.status(),
    `Login endpoint ${loginResponse.url()} returned ${await loginResponse.text()}`,
  ).toBe(200);
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function saveForm(
  page: Page,
  formIndex: number,
  buttonName = "Save",
) {
  await page.locator("form").nth(formIndex).getByRole("button", { name: buttonName }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved successfully." }).last(),
  ).toBeVisible();
}

test("owner, manager, applicant, finance, maintenance, and renewal workflow", async ({
  browser,
}) => {
  const ownerEmail = process.env.E2E_OWNER_EMAIL;
  const ownerPassword = process.env.E2E_OWNER_PASSWORD;
  const managerEmail = process.env.E2E_MANAGER_EMAIL;
  const managerPassword = process.env.E2E_MANAGER_PASSWORD;
  expect(ownerEmail, "E2E_OWNER_EMAIL must be provided by the test database").toBeTruthy();
  expect(ownerPassword, "E2E_OWNER_PASSWORD must be provided by the test database").toBeTruthy();
  expect(managerEmail, "E2E_MANAGER_EMAIL must be provided by the test database").toBeTruthy();
  expect(managerPassword, "E2E_MANAGER_PASSWORD must be provided by the test database").toBeTruthy();

  const runId = Date.now().toString();
  const featurePropertyName = `Property Feature ${runId}`;
  const featurePropertyCode = `UI-${runId.slice(-12)}`;
  const propertyName = `Browser Home ${runId}`;
  const propertyCode = `E2E-${runId.slice(-12)}`;
  const unitNumber = `B-${runId.slice(-8)}`;
  const listingTitle = `Available Home ${runId}`;
  const applicantEmail = `applicant-${runId}@example.test`;
  const ticketTitle = `Repair request ${runId}`;
  const ownerContext = await browser.newContext();
  const managerContext = await browser.newContext();
  const applicantContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  const managerPage = await managerContext.newPage();
  const applicantPage = await applicantContext.newPage();

  try {
    await signIn(ownerPage, ownerEmail, ownerPassword);

    await ownerPage.goto("/properties");
    await ownerPage.getByRole("button", { name: "Add property" }).click();
    const createPropertyDialog = ownerPage.getByRole("dialog", {
      name: "Create property",
    });
    await createPropertyDialog
      .getByLabel("Property name")
      .fill(featurePropertyName);
    await createPropertyDialog
      .getByLabel("Property code")
      .fill(featurePropertyCode);
    await createPropertyDialog
      .getByLabel("Street address")
      .fill("22 Feature Road");
    await createPropertyDialog.getByLabel("City").fill("Mogadishu");
    await createPropertyDialog.getByLabel("Country").fill("Somalia");
    await createPropertyDialog
      .getByLabel("Description")
      .fill("Created through the property feature.");
    await createPropertyDialog
      .getByRole("button", { name: "Create property" })
      .click();
    await expect(ownerPage.getByRole("status")).toContainText(
      "Property created.",
    );

    const featurePropertyRow = ownerPage
      .getByRole("row")
      .filter({ hasText: featurePropertyName });
    await ownerPage.getByLabel("City").fill("Mogadishu");
    await ownerPage.getByLabel("Status", { exact: true }).selectOption("ACTIVE");
    await expect(featurePropertyRow).toBeVisible();
    await ownerPage.getByRole("button", { name: "Reset filters" }).click();
    await featurePropertyRow.getByRole("link").click();
    await expect(
      ownerPage.getByRole("heading", { name: featurePropertyName }),
    ).toBeVisible();

    await ownerPage
      .getByRole("button", { name: `Actions for ${featurePropertyName}` })
      .click();
    await ownerPage.getByRole("button", { name: "Edit property" }).click();
    const editPropertyDialog = ownerPage.getByRole("dialog", {
      name: "Edit property",
    });
    await editPropertyDialog
      .getByLabel("Description")
      .fill("Updated through the property feature.");
    await editPropertyDialog
      .getByRole("button", { name: "Save changes" })
      .click();
    await expect(ownerPage.getByRole("status")).toContainText(
      "Property updated.",
    );

    await ownerPage
      .getByRole("button", { name: `Actions for ${featurePropertyName}` })
      .click();
    await ownerPage.getByRole("button", { name: "Assign manager" }).click();
    const assignmentDialog = ownerPage.getByRole("dialog", {
      name: "Assign property manager",
    });
    await assignmentDialog
      .getByLabel("Property manager email")
      .fill(managerEmail);
    await assignmentDialog
      .getByRole("button", { name: "Assign manager" })
      .click();
    await expect(ownerPage.getByRole("status")).toContainText(
      "Property manager assigned.",
    );

    await ownerPage
      .getByRole("button", { name: `Actions for ${featurePropertyName}` })
      .click();
    await ownerPage.getByRole("button", { name: "Archive property" }).click();
    const archiveDialog = ownerPage.getByRole("dialog", {
      name: "Archive property?",
    });
    await archiveDialog
      .getByRole("button", { name: "Archive property" })
      .click();
    await expect(featurePropertyRow).toContainText("Archived");
    console.log("[e2e] property feature create, filter, edit, assign, archive");

    await ownerPage.goto("/internal/workflows/properties");
    const propertyForm = ownerPage.locator("form").nth(0);
    await propertyForm.getByLabel("Property name").fill(propertyName);
    await propertyForm.getByLabel("Property code").fill(propertyCode);
    await propertyForm.getByLabel("Address").fill("101 Workflow Road");
    await propertyForm.getByLabel("City").fill("Mogadishu");
    await propertyForm.getByLabel("Country").fill("Somalia");
    await saveForm(ownerPage, 0);

    const assignmentForm = ownerPage.locator("form").nth(1);
    await assignmentForm
      .getByLabel("Property", { exact: true })
      .selectOption({ label: propertyName });
    await assignmentForm.getByLabel("Property manager email").fill(managerEmail);
    await saveForm(ownerPage, 1);
    console.log("[e2e] owner property created and manager assigned");

    await signIn(managerPage, managerEmail, managerPassword);
    await managerPage.goto("/internal/workflows/units");
    const unitForm = managerPage.locator("form").nth(0);
    await unitForm
      .getByLabel("Property", { exact: true })
      .selectOption({ label: propertyName });
    await unitForm.getByLabel("Unit number").fill(unitNumber);
    await unitForm.getByLabel("Floor").fill("1");
    await unitForm.getByLabel("Bedrooms").fill("2");
    await unitForm.getByLabel("Bathrooms").fill("1");
    await unitForm.getByLabel("Square meters").fill("72");
    await unitForm.getByLabel("Monthly rent").fill("800.00");
    await unitForm.getByLabel("Deposit amount").fill("800.00");
    await saveForm(managerPage, 0);
    console.log("[e2e] manager created the unit");

    await managerPage.goto("/internal/workflows/listings");
    const listingForm = managerPage.locator("form").nth(0);
    await listingForm.getByLabel("Unit").selectOption({ label: unitNumber });
    await listingForm.getByLabel("Listing title").fill(listingTitle);
    await listingForm.getByLabel("Description").fill("A two-bedroom home.");
    await listingForm.getByLabel("Monthly rent").fill("800.00");
    await listingForm.getByLabel("Deposit amount").fill("800.00");
    await listingForm.getByLabel("Available date").fill(dateOffset(0));
    await saveForm(managerPage, 0);
    const listingRow = managerPage.getByRole("row").filter({ hasText: listingTitle });
    await listingRow.getByRole("button", { name: "Publish" }).click();
    await expect(listingRow).toContainText("Published");
    console.log("[e2e] listing published");

    await applicantPage.goto("/internal/workflows/available-listings");
    await expect(applicantPage.getByText(listingTitle)).toBeVisible();
    await applicantPage.getByLabel("First name").fill("Workflow");
    await applicantPage.getByLabel("Last name").fill("Applicant");
    await applicantPage.getByLabel("Email").fill(applicantEmail);
    await applicantPage.getByLabel("Phone").fill("+252610000000");
    await applicantPage.getByLabel("Monthly income").fill("2400.00");
    await applicantPage.getByLabel("Employer").fill("Workflow Employer");
    await applicantPage.getByLabel("Current address").fill("Mogadishu");
    await applicantPage.getByLabel("Preferred move-in date").fill(dateOffset(0));
    await applicantPage.getByRole("button", { name: "Submit application" }).click();
    await expect(applicantPage.getByRole("status")).toContainText("Saved successfully.");
    console.log("[e2e] applicant submitted application");

    await managerPage.goto("/internal/workflows/applications");
    let applicationRow = managerPage.getByRole("row").filter({ hasText: applicantEmail });
    await expect(applicationRow).toBeVisible();
    await applicationRow.getByRole("button", { name: "Review" }).click();
    await expect(applicationRow).toContainText("Under Review");
    await applicationRow.getByRole("button", { name: "Start screening" }).click();
    const screeningRow = managerPage.getByRole("table").nth(1).getByRole("row").nth(1);
    await expect(screeningRow.getByRole("button", { name: "Start" })).toBeVisible();
    await screeningRow.getByRole("button", { name: "Start" }).click();
    await screeningRow.getByRole("button", { name: "Pass screening" }).click();
    applicationRow = managerPage.getByRole("row").filter({ hasText: applicantEmail });
    await applicationRow.getByRole("button", { name: "Approve application" }).click();
    await expect(applicationRow).toContainText("Approved");
    console.log("[e2e] application screened and approved");

    await managerPage.goto("/internal/workflows/leases");
    const leaseForm = managerPage.locator("form").nth(0);
    await leaseForm.getByLabel("Approved application").selectOption({ index: 1 });
    await leaseForm.getByLabel("Start date").fill(firstOfCurrentMonth());
    await leaseForm.getByLabel("End date").fill(dateOffset(80));
    await leaseForm.getByLabel("Monthly rent").fill("800.00");
    await leaseForm.getByLabel("Security deposit").fill("800.00");
    await leaseForm.getByLabel("Payment due day").fill("1");
    await saveForm(managerPage, 0);

    const leaseRow = managerPage.getByRole("row").nth(1);
    await leaseRow.getByRole("button", { name: "Submit for approval" }).click();
    await leaseRow.getByRole("button", { name: "Approve" }).click();
    await leaseRow.getByRole("button", { name: "Activate" }).click();
    await expect(leaseRow).toContainText("Active");
    console.log("[e2e] lease activated");

    await managerPage.goto("/internal/workflows/finance");
    const financeForms = managerPage.locator("form");
    await financeForms.nth(0).getByLabel("Lease").selectOption({ index: 1 });
    await financeForms.nth(0).getByLabel("Due day of month").fill("1");
    await saveForm(managerPage, 0);
    const today = new Date();
    await financeForms.nth(1).getByLabel("Billing month (1–12)").fill(String(today.getMonth() + 1));
    await financeForms.nth(1).getByLabel("Billing year").fill(String(today.getFullYear()));
    await saveForm(managerPage, 1, "Save");
    const chargeRow = managerPage.getByRole("table").nth(0).getByRole("row").nth(1);
    const issueInvoiceButton = chargeRow.getByRole("button", {
      name: "Issue invoice",
    });
    await expect(issueInvoiceButton).toBeVisible();
    await expect(issueInvoiceButton).toBeEnabled();
    const invoiceResponsePromise = managerPage.waitForResponse(
      (response) =>
        response.url().includes("/issue-invoice/") &&
        response.request().method() === "POST",
      { timeout: 10_000 },
    );
    await issueInvoiceButton.click({ timeout: 10_000 });
    const invoiceResponse = await invoiceResponsePromise;
    expect(
      invoiceResponse.status(),
      `Invoice endpoint returned ${await invoiceResponse.text()}`,
    ).toBe(200);
    await expect(chargeRow).toContainText("Invoiced");

    await financeForms.nth(2).getByLabel("Lease").selectOption({ index: 1 });
    await saveForm(managerPage, 2);
    await financeForms.nth(3).getByLabel("Deposit").selectOption({ index: 1 });
    await financeForms.nth(3).getByLabel("Amount").fill("800.00");
    await financeForms.nth(3).getByLabel("Payment reference").fill(`DEP-${runId}`);
    await financeForms.nth(3).getByLabel("Payment date").fill(dateOffset(0));
    await financeForms.nth(3).getByLabel("Payment method").selectOption("MOBILE_MONEY");
    await saveForm(managerPage, 3);

    await financeForms.nth(4).getByLabel("Tenant").selectOption({ index: 1 });
    await financeForms.nth(4).getByLabel("Amount").fill("800.00");
    await financeForms.nth(4).getByLabel("Payment date").fill(dateOffset(0));
    await financeForms.nth(4).getByLabel("Payment reference").fill(`PAY-${runId}`);
    await financeForms.nth(4).getByLabel("Payment method").selectOption("MOBILE_MONEY");
    await financeForms.nth(4).getByLabel("Notes").fill("Recorded through browser workflow.");
    await saveForm(managerPage, 4);
    await financeForms.nth(5).getByLabel("Payment").selectOption({ index: 1 });
    await financeForms.nth(5).getByLabel("Rent charge").selectOption({ index: 1 });
    await financeForms.nth(5).getByLabel("Amount to allocate").fill("800.00");
    await saveForm(managerPage, 5);
    await expect(managerPage.getByText(/RCP-/)).toBeVisible();
    console.log("[e2e] finance records and receipt created");

    await managerPage.goto("/internal/workflows/maintenance");
    const maintenanceForm = managerPage.locator("form").nth(0);
    await maintenanceForm.getByLabel("Unit").selectOption({ label: unitNumber });
    await maintenanceForm.getByLabel("Tenant profile").selectOption({ index: 1 });
    await maintenanceForm.getByLabel("Request title").fill(ticketTitle);
    await maintenanceForm.getByLabel("Description").fill("Repair a leaking tap.");
    await maintenanceForm.getByLabel("Category").selectOption("PLUMBING");
    await maintenanceForm.getByLabel("Priority").selectOption("MEDIUM");
    await saveForm(managerPage, 0);
    const ticketRow = managerPage.getByRole("row").filter({ hasText: ticketTitle });
    await ticketRow.getByRole("button", { name: "Assign to me" }).click();
    await ticketRow.getByRole("button", { name: "Start work" }).click();
    await ticketRow.getByRole("button", { name: "Resolve" }).click();
    await expect(ticketRow).toContainText("Resolved");
    console.log("[e2e] maintenance ticket resolved");

    await managerPage.goto("/internal/workflows/renewals");
    await managerPage.getByRole("button", { name: "Generate renewal alerts" }).click();
    await expect(managerPage.getByRole("table").getByText("Unread")).toBeVisible();
    const renewalForm = managerPage.locator("form").nth(0);
    await renewalForm.getByLabel("Expiring lease").selectOption({ index: 1 });
    await renewalForm.getByLabel("New lease end date").fill(dateOffset(445));
    await saveForm(managerPage, 0);
    console.log("[e2e] renewal alert generated and lease renewed");

    await managerPage.goto("/internal/workflows/finance");
    await expect(
      managerPage.getByRole("table").filter({ hasText: `PAY-${runId}` }),
    ).toContainText("Completed");
  } finally {
    await ownerContext.close();
    await managerContext.close();
    await applicantContext.close();
  }
});
