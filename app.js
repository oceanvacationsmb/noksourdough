const SUPABASE_URL = "https://rbowvjsylgpdunpbrgye.supabase.co";
const SUPABASE_KEY = "sb_publishable_5ES5DIUJCJnFMLVQFFgl4g_2LIISqZF";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const sidePanel = document.getElementById("sidePanel");
const panelTitle = document.getElementById("panelTitle");
const closePanel = document.getElementById("closePanel");

const customerForm = document.getElementById("customerForm");
const productForm = document.getElementById("productForm");

document.getElementById("addCustomerBtn").addEventListener("click", function () {
    panelTitle.innerText = "Add Customer";
    customerForm.style.display = "block";
    productForm.style.display = "none";
    sidePanel.classList.add("open");
});

document.getElementById("addProductBtn").addEventListener("click", function () {
    panelTitle.innerText = "Add Product";
    customerForm.style.display = "none";
    productForm.style.display = "block";
    sidePanel.classList.add("open");
});

closePanel.addEventListener("click", function () {
    sidePanel.classList.remove("open");
});

document.getElementById("saveCustomerBtn").addEventListener("click", saveCustomer);
document.getElementById("saveProductBtn").addEventListener("click", saveProduct);

async function saveCustomer() {
    const name = document.getElementById("customerName").value.trim();
    const phone = document.getElementById("customerPhone").value.trim();
    const email = document.getElementById("customerEmail").value.trim();
    const address = document.getElementById("customerAddress").value.trim();

    if (!name) {
        alert("Customer name is required");
        return;
    }

    const { error } = await db.from("customers").insert([
        { name, phone, email, address }
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

    sidePanel.classList.remove("open");
    loadCounts();
}

async function saveProduct() {
    const name = document.getElementById("productName").value.trim();
    const price = document.getElementById("productPrice").value.trim();

    if (!name) {
        alert("Product name is required");
        return;
    }

    if (!price) {
        alert("Price is required");
        return;
    }

    const { error } = await db.from("products").insert([
        { name: name, price: Number(price) }
    ]);

    if (error) {
        alert(error.message);
        return;
    }

    alert("Product saved");

    document.getElementById("productName").value = "";
    document.getElementById("productPrice").value = "";

    sidePanel.classList.remove("open");
    loadCounts();
}

async function loadCounts() {
    const customersResult = await db.from("customers").select("*", { count: "exact", head: true });
    const productsResult = await db.from("products").select("*", { count: "exact", head: true });
    const invoicesResult = await db.from("invoices").select("*", { count: "exact", head: true });

    document.getElementById("customersCount").innerText = customersResult.count || 0;
    document.getElementById("productsCount").innerText = productsResult.count || 0;
    document.getElementById("invoicesCount").innerText = invoicesResult.count || 0;
}

document.getElementById("exportPdfBtn").addEventListener("click", function () {
    window.print();
});

loadCounts();
