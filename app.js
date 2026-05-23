const SUPABASE_URL = "https://rbowvjsylgpdunpbrgye.supabase.co";
const SUPABASE_KEY = "sb_publishable_5ES5DIUJCJnFMLVQFFgl4g_2LIISqZF";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const sidePanel = document.getElementById("sidePanel");
const addCustomerBtn = document.getElementById("addCustomerBtn");
const closePanel = document.getElementById("closePanel");
const saveCustomerBtn = document.getElementById("saveCustomerBtn");

if (addCustomerBtn) {
    addCustomerBtn.addEventListener("click", () => {
        sidePanel.classList.add("open");
    });
}

if (closePanel) {
    closePanel.addEventListener("click", () => {
        sidePanel.classList.remove("open");
    });
}

if (saveCustomerBtn) {
    saveCustomerBtn.addEventListener("click", saveCustomer);
}

async function saveCustomer() {

    const name = document.getElementById("customerName").value.trim();
    const phone = document.getElementById("customerPhone").value.trim();
    const email = document.getElementById("customerEmail").value.trim();
    const address = document.getElementById("customerAddress").value.trim();

    if (!name) {
        alert("Customer name is required");
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
        console.error(error);
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

async function loadCounts() {

    try {

        const customersResult = await db
            .from("customers")
            .select("*", {
                count: "exact",
                head: true
            });

        const productsResult = await db
            .from("products")
            .select("*", {
                count: "exact",
                head: true
            });

        const invoicesResult = await db
            .from("invoices")
            .select("*", {
                count: "exact",
                head: true
            });

        document.getElementById("customersCount").innerText =
            customersResult.count || 0;

        document.getElementById("productsCount").innerText =
            productsResult.count || 0;

        document.getElementById("invoicesCount").innerText =
            invoicesResult.count || 0;

    } catch (err) {

        console.error(err);

    }
}

const exportPdfBtn = document.getElementById("exportPdfBtn");

if (exportPdfBtn) {
    exportPdfBtn.addEventListener("click", () => {
        window.print();
    });
}

loadCounts();
