const SUPABASE_URL = "https://rbowvjsylgpdunpbrgye.supabase.co";
const SUPABASE_KEY = "sb_publishable_5ES5DIUJCJnFMLVQFFgl4g_2LIISqZF";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let invoiceItems = [];
let customersCache = [];

document.addEventListener("DOMContentLoaded", async () => {
    hookupButtons();

    setToday();

    await loadDashboard();
    await loadCustomers();
    await loadProducts();
    await loadCompanyProfile();
    await loadInvoiceNumber();
    await loadInvoices();
});

function hookupButtons() {
    document.getElementById("saveCustomerBtn")?.addEventListener("click", saveCustomer);
    document.getElementById("saveProductBtn")?.addEventListener("click", saveProduct);
    document.getElementById("saveCompanyBtn")?.addEventListener("click", saveCompany);
    document.getElementById("addItemBtn")?.addEventListener("click", addInvoiceItem);
    document.getElementById("saveInvoiceBtn")?.addEventListener("click", saveInvoice);
    document.getElementById("invoiceCustomer")?.addEventListener("change", updateTermsFromCustomer);
    document.getElementById("invoiceTerms")?.addEventListener("change", calculateDueDate);
    document.getElementById("invoiceFilter")?.addEventListener("change", loadInvoices);
}

function setToday() {
    const today = new Date().toISOString().split("T")[0];
    const invoiceDate = document.getElementById("invoiceDate");

    if (invoiceDate) {
        invoiceDate.value = today;
    }

    calculateDueDate();
}

function calculateDueDate() {
    const invoiceDateInput = document.getElementById("invoiceDate");
    const dueDateInput = document.getElementById("invoiceDueDate");
    const termsInput = document.getElementById("invoiceTerms");

    if (!invoiceDateInput || !dueDateInput || !termsInput) return;

    const start = new Date(invoiceDateInput.value);
    let days = 30;

    if (termsInput.value === "COD") days = 0;
    if (termsInput.value === "Net 15") days = 15;
    if (termsInput.value === "Net 30") days = 30;
    if (termsInput.value === "Net 45") days = 45;
    if (termsInput.value === "Net 60") days = 60;

    start.setDate(start.getDate() + days);
    dueDateInput.value = start.toISOString().split("T")[0];
}

function updateTermsFromCustomer() {
    const customerId = document.getElementById("invoiceCustomer").value;
    const customer = customersCache.find(c => String(c.id) === String(customerId));

    if (customer && customer.payment_terms) {
        document.getElementById("invoiceTerms").value = customer.payment_terms;
    }

    calculateDueDate();
}

async function loadDashboard() {
    const customers = await db.from("customers").select("*", { count: "exact", head: true });
    const products = await db.from("products").select("*", { count: "exact", head: true });
    const invoices = await db.from("invoices").select("*", { count: "exact", head: true }).eq("deleted", false);
    const pastDue = await db.from("invoices").select("*", { count: "exact", head: true }).eq("status", "Past Due").eq("deleted", false);

    document.getElementById("customersCount").innerText = customers.count || 0;
    document.getElementById("productsCount").innerText = products.count || 0;
    document.getElementById("invoicesCount").innerText = invoices.count || 0;
    document.getElementById("pastDueCount").innerText = pastDue.count || 0;
}

async function saveCustomer() {
    const name = document.getElementById("customerName").value;
    const phone = document.getElementById("customerPhone").value;
    const email = document.getElementById("customerEmail").value;
    const address = document.getElementById("customerAddress").value;
    const terms = document.getElementById("customerTerms").value;

    if (!name) {
        alert("Customer name required");
        return;
    }

    const result = await db.from("customers").insert([
        {
            name,
            phone,
            email,
            address,
            payment_terms: terms
        }
    ]);

    if (result.error) {
        alert(result.error.message);
        return;
    }

    alert("Customer saved");

    document.getElementById("customerName").value = "";
    document.getElementById("customerPhone").value = "";
    document.getElementById("customerEmail").value = "";
    document.getElementById("customerAddress").value = "";

    await loadCustomers();
    await loadDashboard();
}

async function loadCustomers() {
    const result = await db.from("customers").select("*").order("name");

    customersCache = result.data || [];

    const table = document.getElementById("customerTableBody");
    const select = document.getElementById("invoiceCustomer");

    if (table) table.innerHTML = "";
    if (select) select.innerHTML = "";

    customersCache.forEach(customer => {
        if (table) {
            table.innerHTML += `
            <tr>
                <td>${customer.name || ""}</td>
                <td>${customer.phone || ""}</td>
                <td>${customer.email || ""}</td>
                <td>${customer.payment_terms || ""}</td>
            </tr>
            `;
        }

        if (select) {
            select.innerHTML += `
            <option value="${customer.id}">
                ${customer.name}
            </option>
            `;
        }
    });

    updateTermsFromCustomer();
}

async function saveProduct() {
    const name = document.getElementById("productName").value;
    const price = document.getElementById("productPrice").value;

    if (!name) {
        alert("Product name required");
        return;
    }

    const result = await db.from("products").insert([
        {
            name,
            price: Number(price)
        }
    ]);

    if (result.error) {
        alert(result.error.message);
        return;
    }

    alert("Product saved");

    document.getElementById("productName").value = "";
    document.getElementById("productPrice").value = "";

    await loadProducts();
    await loadDashboard();
}

async function loadProducts() {
    const result = await db.from("products").select("*").order("name");

    const table = document.getElementById("productTableBody");
    const select = document.getElementById("invoiceProduct");

    if (table) table.innerHTML = "";
    if (select) select.innerHTML = "";

    (result.data || []).forEach(product => {
        if (table) {
            table.innerHTML += `
            <tr>
                <td>${product.name}</td>
                <td>$${Number(product.price || 0).toFixed(2)}</td>
            </tr>
            `;
        }

        if (select) {
            select.innerHTML += `
            <option value="${product.id}" data-price="${product.price}">
                ${product.name}
            </option>
            `;
        }
    });
}

async function saveCompany() {
    const company_name = document.getElementById("companyName").value;
    const company_phone = document.getElementById("companyPhone").value;
    const company_email = document.getElementById("companyEmail").value;
    const company_address = document.getElementById("companyAddress").value;
    const website = document.getElementById("companyWebsite").value;
    const tax_id = document.getElementById("taxId").value;
    const company_logo = document.getElementById("companyLogo").value;

    const existing = await db.from("company_settings").select("*").limit(1);

    if (existing.data && existing.data.length) {
        await db.from("company_settings").update({
            company_name,
            company_phone,
            company_email,
            company_address,
            website,
            tax_id,
            company_logo
        }).eq("id", existing.data[0].id);
    } else {
        await db.from("company_settings").insert([
            {
                company_name,
                company_phone,
                company_email,
                company_address,
                website,
                tax_id,
                company_logo
            }
        ]);
    }

    alert("Company saved");
}

async function loadCompanyProfile() {
    const result = await db.from("company_settings").select("*").limit(1);

    if (!result.data || !result.data.length) return;

    const c = result.data[0];

    document.getElementById("companyName").value = c.company_name || "";
    document.getElementById("companyPhone").value = c.company_phone || "";
    document.getElementById("companyEmail").value = c.company_email || "";
    document.getElementById("companyAddress").value = c.company_address || "";
    document.getElementById("companyWebsite").value = c.website || "";
    document.getElementById("taxId").value = c.tax_id || "";
    document.getElementById("companyLogo").value = c.company_logo || "";
}

async function loadInvoiceNumber() {
    const { data, error } = await db.from("invoice_counter").select("*").limit(1);

    if (error || !data || data.length === 0) {
        document.getElementById("invoiceNumber").value = "1000";
        return;
    }

    document.getElementById("invoiceNumber").value = data[0].next_number;
}

function addInvoiceItem() {
    const select = document.getElementById("invoiceProduct");
    const option = select.options[select.selectedIndex];
    const qty = Number(document.getElementById("invoiceQty").value);
    const price = Number(option.dataset.price);
    const total = qty * price;

    invoiceItems.push({
        product_id: option.value,
        description: option.text.trim(),
        quantity: qty,
        unit_price: price,
        line_total: total
    });

    renderInvoiceItems();
}

function renderInvoiceItems() {
    const body = document.getElementById("invoiceItemsBody");
    body.innerHTML = "";

    let grandTotal = 0;

    invoiceItems.forEach(item => {
        grandTotal += item.line_total;

        body.innerHTML += `
        <tr>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>$${item.unit_price.toFixed(2)}</td>
            <td>$${item.line_total.toFixed(2)}</td>
        </tr>
        `;
    });

    document.getElementById("invoiceTotal").innerText = grandTotal.toFixed(2);
}

async function saveInvoice() {
    if (invoiceItems.length === 0) {
        alert("Add at least one item");
        return;
    }

    const counter = await db.from("invoice_counter").select("*").limit(1);
    const invoiceNumber = counter.data[0].next_number;

    const total = Number(document.getElementById("invoiceTotal").innerText);

    const invoice = await db.from("invoices").insert([
        {
            invoice_number: invoiceNumber,
            customer_id: document.getElementById("invoiceCustomer").value,
            invoice_date: document.getElementById("invoiceDate").value,
            due_date: document.getElementById("invoiceDueDate").value,
            payment_terms: document.getElementById("invoiceTerms").value,
            notes: document.getElementById("invoiceNotes").value,
            total: total,
            paid_amount: 0,
            balance: total,
            status: "Unpaid",
            deleted: false
        }
    ]).select();

    if (invoice.error) {
        alert(invoice.error.message);
        return;
    }

    const invoiceId = invoice.data[0].id;

    for (const item of invoiceItems) {
        await db.from("invoice_items").insert([
            {
                invoice_id: invoiceId,
                product_id: item.product_id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                line_total: item.line_total
            }
        ]);
    }

    await db.from("invoice_counter").update({
        next_number: invoiceNumber + 1
    }).eq("id", counter.data[0].id);

    alert("Invoice #" + invoiceNumber + " saved");

    invoiceItems = [];
    renderInvoiceItems();

    document.getElementById("invoiceNotes").value = "";

    await loadInvoiceNumber();
    await loadDashboard();
    await loadInvoices();
}

async function loadInvoices() {
    const filter = document.getElementById("invoiceFilter")?.value || "all";

    let query = db.from("invoices").select("*").eq("deleted", false).order("id", { ascending: false });

    if (filter !== "all") {
        query = query.eq("status", filter);
    }

    const result = await query;

    const body = document.getElementById("invoiceListBody");
    if (!body) return;

    body.innerHTML = "";

    let sales = 0;
    let paid = 0;
    let unpaid = 0;

    (result.data || []).forEach(inv => {
        const customer = customersCache.find(c => String(c.id) === String(inv.customer_id));
        const total = Number(inv.total || 0);

        sales += total;

        if (inv.status === "Paid") {
            paid += total;
        } else {
            unpaid += total;
        }

        body.innerHTML += `
        <tr>
            <td>${inv.invoice_number}</td>
            <td>${customer ? customer.name : ""}</td>
            <td>${inv.invoice_date || ""}</td>
            <td>${inv.due_date || ""}</td>
            <td>$${total.toFixed(2)}</td>
            <td>${inv.status || "Unpaid"}</td>
            <td>
                <button class="success" onclick="markInvoicePaid(${inv.id})">Paid</button>
                <button class="primary" onclick="markInvoiceUnpaid(${inv.id})">Unpaid</button>
                <button class="danger" onclick="deleteInvoice(${inv.id})">Delete</button>
            </td>
        </tr>
        `;
    });

    document.getElementById("salesTotal").innerText = "$" + sales.toFixed(2);
    document.getElementById("paidTotal").innerText = "$" + paid.toFixed(2);
    document.getElementById("unpaidTotal").innerText = "$" + unpaid.toFixed(2);
}

async function markInvoicePaid(id) {
    await db.from("invoices").update({
        status: "Paid",
        paid_date: new Date().toISOString().split("T")[0]
    }).eq("id", id);

    await loadInvoices();
    await loadDashboard();
}

async function markInvoiceUnpaid(id) {
    await db.from("invoices").update({
        status: "Unpaid",
        paid_date: null
    }).eq("id", id);

    await loadInvoices();
    await loadDashboard();
}

async function deleteInvoice(id) {
    if (!confirm("Delete this invoice?")) return;

    await db.from("invoices").update({
        deleted: true
    }).eq("id", id);

    await loadInvoices();
    await loadDashboard();
}
