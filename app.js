const SUPABASE_URL = "https://rbowvjsylgpdunpbrgye.supabase.co";
const SUPABASE_KEY = "sb_publishable_5ES5DIUJCJnFMLVQFFgl4g_2LIISqZF";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.getElementById("addCustomerBtn").onclick = function () {
  document.getElementById("sidePanel").classList.add("open");
};

document.getElementById("closePanel").onclick = function () {
  document.getElementById("sidePanel").classList.remove("open");
};

document.getElementById("saveCustomerBtn").onclick = async function () {
  const name = document.getElementById("customerName").value;
  const phone = document.getElementById("customerPhone").value;
  const email = document.getElementById("customerEmail").value;
  const address = document.getElementById("customerAddress").value;

  if (!name) {
    alert("Customer name is required");
    return;
  }

  const { error } = await supabase.from("customers").insert({
    name: name,
    phone: phone,
    email: email,
    address: address
  });

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
};

document.getElementById("addProductBtn").onclick = function () {
  alert("Products will be next");
};

document.getElementById("createInvoiceBtn").onclick = function () {
  alert("Invoices will be next");
};

document.getElementById("exportPdfBtn").onclick = function () {
  window.print();
};

async function loadCounts() {
  const { count: customersCount } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });

  const { count: productsCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  const { count: invoicesCount } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true });

  const { count: pastDueCount } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("status", "past due");

  document.getElementById("customersCount").innerText = customersCount || 0;
  document.getElementById("productsCount").innerText = productsCount || 0;
  document.getElementById("invoicesCount").innerText = invoicesCount || 0;
  document.getElementById("pastDueCount").innerText = pastDueCount || 0;
}

loadCounts();
