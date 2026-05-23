const SUPABASE_URL = "https://rbowvjsylgpdunpbrgye.supabase.co";
const SUPABASE_KEY = "sb_publishable_5ES5DIUJCJnFMLVQFFgl4g_2LIISqZF";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

window.addEventListener("DOMContentLoaded", () => {

  const sidePanel = document.getElementById("sidePanel");
  const panelTitle = document.getElementById("panelTitle");

  const customerForm = document.getElementById("customerForm");
  const productForm = document.getElementById("productForm");

  const addCustomerBtn = document.getElementById("addCustomerBtn");
  const addProductBtn = document.getElementById("addProductBtn");
  const closePanel = document.getElementById("closePanel");

  const saveCustomerBtn = document.getElementById("saveCustomerBtn");
  const saveProductBtn = document.getElementById("saveProductBtn");

  if (addCustomerBtn) {
    addCustomerBtn.onclick = function () {
      panelTitle.innerText = "Add Customer";
      customerForm.style.display = "block";
      productForm.style.display = "none";
      sidePanel.classList.add("open");
    };
  }

  if (addProductBtn) {
    addProductBtn.onclick = function () {
      panelTitle.innerText = "Add Product";
      customerForm.style.display = "none";
      productForm.style.display = "block";
      sidePanel.classList.add("open");
    };
  }

  if (closePanel) {
    closePanel.onclick = function () {
      sidePanel.classList.remove("open");
    };
  }

  if (saveCustomerBtn) {
    saveCustomerBtn.onclick = saveCustomer;
  }

  if (saveProductBtn) {
    saveProductBtn.onclick = saveProduct;
  }

  loadCounts();

});

async function saveCustomer() {

  const name = document.getElementById("customerName").value.trim();
  const phone = document.getElementById("customerPhone").value.trim();
  const email = document.getElementById("customerEmail").value.trim();
  const address = document.getElementById("customerAddress").value.trim();

  if (!name) {
    alert("Customer name required");
    return;
  }

  const { error } = await db
    .from("customers")
    .insert([
      {
        name,
        phone,
        email,
        address
      }
    ]);

  if (error) {
    alert(error.message);
    return;
  }

  alert("Customer saved");

  document.getElementById("customerName").value = "";
  document.getElementById("customerPhone").value = "";
  document.getElementById("customerEmail").value = "";
  document.getElementById("customerAddress").value = "";

  document.getElementById("sidePanel").classList.remove("open");

  loadCounts();
}

async function saveProduct() {

  const name = document.getElementById("productName").value.trim();
  const price = document.getElementById("productPrice").value;

  if (!name) {
    alert("Product name required");
    return;
  }

  const { error } = await db
    .from("products")
    .insert([
      {
        name: name,
        price: Number(price)
      }
    ]);

  if (error) {
    alert(error.message);
    return;
  }

  alert("Product saved");

  document.getElementById("productName").value = "";
  document.getElementById("productPrice").value = "";

  document.getElementById("sidePanel").classList.remove("open");

  loadCounts();
}

async function loadCounts() {

  try {

    const customers = await db
      .from("customers")
      .select("*", { count: "exact", head: true });

    const products = await db
      .from("products")
      .select("*", { count: "exact", head: true });

    const invoices = await db
      .from("invoices")
      .select("*", { count: "exact", head: true });

    document.getElementById("customersCount").innerText =
      customers.count || 0;

    document.getElementById("productsCount").innerText =
      products.count || 0;

    document.getElementById("invoicesCount").innerText =
      invoices.count || 0;

  } catch (e) {
    console.log(e);
  }
}

async function saveCompanyProfile() {

    const companyName =
        document.getElementById("companyName").value;

    const companyPhone =
        document.getElementById("companyPhone").value;

    const companyEmail =
        document.getElementById("companyEmail").value;

    const companyAddress =
        document.getElementById("companyAddress").value;

    const companyWebsite =
        document.getElementById("companyWebsite").value;

    const taxId =
        document.getElementById("taxId").value;

    const existing =
        await db
        .from("company_settings")
        .select("*")
        .limit(1);

    if (existing.data.length > 0) {

        await db
        .from("company_settings")
        .update({
            company_name: companyName,
            company_phone: companyPhone,
            company_email: companyEmail,
            company_address: companyAddress,
            website: companyWebsite,
            tax_id: taxId
        })
        .eq("id", existing.data[0].id);

    } else {

        await db
        .from("company_settings")
        .insert([
            {
                company_name: companyName,
                company_phone: companyPhone,
                company_email: companyEmail,
                company_address: companyAddress,
                website: companyWebsite,
                tax_id: taxId
            }
        ]);

    }

    alert("Company profile saved");
}

async function loadCompanyProfile() {

    const result =
        await db
        .from("company_settings")
        .select("*")
        .limit(1);

    if (!result.data.length) return;

    const company = result.data[0];

    document.getElementById("companyName").value =
        company.company_name || "";

    document.getElementById("companyPhone").value =
        company.company_phone || "";

    document.getElementById("companyEmail").value =
        company.company_email || "";

    document.getElementById("companyAddress").value =
        company.company_address || "";

    document.getElementById("companyWebsite").value =
        company.website || "";

    document.getElementById("taxId").value =
        company.tax_id || "";
}
