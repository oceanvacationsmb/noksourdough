const SUPABASE_URL = "https://rbowvjsylgpdunpbrgye.supabase.co";
const SUPABASE_KEY = "sb_publishable_5ES5DIUJCJnFMLVQFFgl4g_2LIISqZF
";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const MONEY = "฿";

let invoiceItems = [];
let customersCache = [];
let productsCache = [];
let companyCache = null;

document.addEventListener("DOMContentLoaded", async () => {
    hookupButtons();
    setToday();

    await loadCustomers();
    await loadProducts();
    await loadCompanyProfile();
    await loadInvoiceNumber();
    await loadDashboard();
    await loadInvoices();
    await runReport();
});

function hookupButtons() {
    document.getElementById("openCustomerModalBtn")?.addEventListener("click", openNewCustomerModal);
    document.getElementById("openInvoiceModalBtn")?.addEventListener("click", openNewInvoiceModal);

    document.getElementById("saveCustomerBtn")?.addEventListener("click", saveCustomer);
    document.getElementById("saveProductBtn")?.addEventListener("click", saveProduct);
    document.getElementById("saveCompanyBtn")?.addEventListener("click", saveCompany);

    document.getElementById("addItemBtn")?.addEventListener("click", addInvoiceItem);
    document.getElementById("saveInvoiceBtn")?.addEventListener("click", saveInvoice);

    document.getElementById("invoiceCustomer")?.addEventListener("change", updateTermsFromCustomer);
    document.getElementById("invoiceTerms")?.addEventListener("change", calculateDueDate);
    document.getElementById("invoiceDate")?.addEventListener("change", calculateDueDate);
    document.getElementById("invoiceFilter")?.addEventListener("change", loadInvoices);
    document.getElementById("runReportBtn")?.addEventListener("click", runReport);
}

function openCustomerModal() {
    document.getElementById("customerModal").classList.add("show");
}

function closeCustomerModal() {
    document.getElementById("customerModal").classList.remove("show");
}

function openNewCustomerModal() {
    document.getElementById("customerModalTitle").innerText = "Add New Customer";
    document.getElementById("editingCustomerId").value = "";
    document.getElementById("customerName").value = "";
    document.getElementById("customerPhone").value = "";
    document.getElementById("customerEmail").value = "";
    document.getElementById("customerTaxId").value = "";
    document.getElementById("customerAddress").value = "";
    document.getElementById("customerTerms").value = "Net 30";
    openCustomerModal();
}

function openInvoiceModal() {
    document.getElementById("invoiceModal").classList.add("show");
}

function closeInvoiceModal() {
    document.getElementById("invoiceModal").classList.remove("show");
}

async function openNewInvoiceModal() {
    document.getElementById("invoiceModalTitle").innerText = "Create Invoice";
    document.getElementById("saveInvoiceBtn").innerText = "Save Invoice";
    document.getElementById("editingInvoiceId").value = "";

    invoiceItems = [];
    renderInvoiceItems();

    setToday();
    document.getElementById("invoiceNotes").value = "";

    await loadInvoiceNumber();
    updateTermsFromCustomer();

    openInvoiceModal();
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

    const start = new Date(invoiceDateInput.value || new Date());
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
    const customerId = document.getElementById("invoiceCustomer")?.value;
    const customer = customersCache.find(c => String(c.id) === String(customerId));

    if (customer && customer.payment_terms) {
        document.getElementById("invoiceTerms").value = customer.payment_terms;
    }

    showSelectedCustomerInfo();
    calculateDueDate();
}

function showSelectedCustomerInfo() {
    const box = document.getElementById("selectedCustomerInfo");
    if (!box) return;

    const customerId = document.getElementById("invoiceCustomer")?.value;
    const customer = customersCache.find(c => String(c.id) === String(customerId));

    if (!customer) {
        box.innerHTML = "";
        return;
    }

    box.innerHTML = `
        <strong>${customer.name || ""}</strong><br>
        Phone: ${customer.phone || ""}<br>
        Email: ${customer.email || ""}<br>
        Tax ID: ${customer.tax_id || ""}<br>
        Address: ${customer.address || ""}<br>
        Terms: ${customer.payment_terms || ""}
    `;
}

async function loadDashboard() {
    const customers = await db.from("customers").select("*", { count: "exact", head: true });
    const products = await db.from("products").select("*", { count: "exact", head: true });
    const invoices = await db.from("invoices").select("*").eq("deleted", false);

    const invoiceData = invoices.data || [];

    let totalSales = 0;
    let unpaidTotal = 0;
    let unpaidCount = 0;
    let pastDueCount = 0;

    const today = new Date().toISOString().split("T")[0];

    invoiceData.forEach(inv => {
        const total = Number(inv.total || 0);
        totalSales += total;

        if (inv.status !== "Paid") {
            unpaidCount++;
            unpaidTotal += total;
        }

        if (inv.status !== "Paid" && inv.due_date && inv.due_date < today) {
            pastDueCount++;
        }
    });

    document.getElementById("customersCount").innerText = customers.count || 0;
    document.getElementById("productsCount").innerText = products.count || 0;
    document.getElementById("invoicesCount").innerText = invoiceData.length;
    document.getElementById("pastDueCount").innerText = pastDueCount;
    document.getElementById("dashboardSalesTotal").innerText = MONEY + totalSales.toFixed(2);
    document.getElementById("dashboardUnpaidCount").innerText = unpaidCount;
    document.getElementById("dashboardUnpaidTotal").innerText = MONEY + unpaidTotal.toFixed(2);
}

async function saveCustomer() {
    const id = document.getElementById("editingCustomerId").value;
    const name = document.getElementById("customerName").value.trim();
    const phone = document.getElementById("customerPhone").value.trim();
    const email = document.getElementById("customerEmail").value.trim();
    const address = document.getElementById("customerAddress").value.trim();
    const payment_terms = document.getElementById("customerTerms").value;
    const tax_id = document.getElementById("customerTaxId").value.trim();

    if (!name) {
        alert("Customer name required");
        return;
    }

    const customerData = {
        name,
        phone,
        email,
        address,
        payment_terms,
        tax_id
    };

    let result;

    if (id) {
        result = await db.from("customers").update(customerData).eq("id", id);
    } else {
        result = await db.from("customers").insert([customerData]);
    }

    if (result.error) {
        alert(result.error.message);
        return;
    }

    alert(id ? "Customer updated" : "Customer saved");

    closeCustomerModal();

    await loadCustomers();
    await loadDashboard();
    await runReport();
}

async function loadCustomers() {
    const result = await db.from("customers").select("*").order("name");

    customersCache = result.data || [];

    const table = document.getElementById("customerTableBody");
    const select = document.getElementById("invoiceCustomer");
    const reportCustomer = document.getElementById("reportCustomer");

    if (table) table.innerHTML = "";
    if (select) select.innerHTML = "";
    if (reportCustomer) reportCustomer.innerHTML = `<option value="all">All Customers</option>`;

    customersCache.forEach(customer => {
        if (table) {
            table.innerHTML += `
            <tr>
                <td>${customer.name || ""}</td>
                <td>${customer.phone || ""}</td>
                <td>${customer.email || ""}</td>
                <td>${customer.tax_id || ""}</td>
                <td>${customer.payment_terms || ""}</td>
                <td>
                    <button class="primary" onclick="editCustomer(${customer.id})">Edit</button>
                    <button class="danger" onclick="deleteCustomer(${customer.id})">Delete</button>
                </td>
            </tr>
            `;
        }

        if (select) {
            select.innerHTML += `<option value="${customer.id}">${customer.name}</option>`;
        }

        if (reportCustomer) {
            reportCustomer.innerHTML += `<option value="${customer.id}">${customer.name}</option>`;
        }
    });

    updateTermsFromCustomer();
}

function editCustomer(id) {
    const customer = customersCache.find(c => String(c.id) === String(id));
    if (!customer) return;

    document.getElementById("customerModalTitle").innerText = "Edit Customer";
    document.getElementById("editingCustomerId").value = customer.id;
    document.getElementById("customerName").value = customer.name || "";
    document.getElementById("customerPhone").value = customer.phone || "";
    document.getElementById("customerEmail").value = customer.email || "";
    document.getElementById("customerTaxId").value = customer.tax_id || "";
    document.getElementById("customerAddress").value = customer.address || "";
    document.getElementById("customerTerms").value = customer.payment_terms || "Net 30";

    openCustomerModal();
}

async function deleteCustomer(id) {
    if (!confirm("Delete this customer?")) return;

    const result = await db.from("customers").delete().eq("id", id);

    if (result.error) {
        alert(result.error.message);
        return;
    }

    await loadCustomers();
    await loadDashboard();
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

    productsCache = result.data || [];

    const table = document.getElementById("productTableBody");
    const select = document.getElementById("invoiceProduct");

    if (table) table.innerHTML = "";
    if (select) select.innerHTML = "";

    productsCache.forEach(product => {
        if (table) {
            table.innerHTML += `
            <tr>
                <td>${product.name}</td>
                <td>${MONEY}${Number(product.price || 0).toFixed(2)}</td>
            </tr>
            `;
        }

        if (select) {
            select.innerHTML += `<option value="${product.id}" data-price="${product.price}">${product.name}</option>`;
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
        await db.from("company_settings")
            .update({
                company_name,
                company_phone,
                company_email,
                company_address,
                website,
                tax_id,
                company_logo
            })
            .eq("id", existing.data[0].id);
    } else {
        await db.from("company_settings")
            .insert([
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
    await loadCompanyProfile();
}

async function loadCompanyProfile() {
    const result = await db.from("company_settings").select("*").limit(1);

    if (!result.data || !result.data.length) return;

    companyCache = result.data[0];

    document.getElementById("companyName").value = companyCache.company_name || "";
    document.getElementById("companyPhone").value = companyCache.company_phone || "";
    document.getElementById("companyEmail").value = companyCache.company_email || "";
    document.getElementById("companyAddress").value = companyCache.company_address || "";
    document.getElementById("companyWebsite").value = companyCache.website || "";
    document.getElementById("taxId").value = companyCache.tax_id || "";
    document.getElementById("companyLogo").value = companyCache.company_logo || "";
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

    if (!option) {
        alert("Select product");
        return;
    }

    const qty = Number(document.getElementById("invoiceQty").value || 1);
    const price = Number(option.dataset.price || 0);
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

function removeInvoiceItem(index) {
    invoiceItems.splice(index, 1);
    renderInvoiceItems();
}

function renderInvoiceItems() {
    const body = document.getElementById("invoiceItemsBody");
    body.innerHTML = "";

    let grandTotal = 0;

    invoiceItems.forEach((item, index) => {
        grandTotal += Number(item.line_total || 0);

        body.innerHTML += `
        <tr>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>${MONEY}${Number(item.unit_price || 0).toFixed(2)}</td>
            <td>${MONEY}${Number(item.line_total || 0).toFixed(2)}</td>
            <td><button class="danger" onclick="removeInvoiceItem(${index})">X</button></td>
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

    const editingId = document.getElementById("editingInvoiceId").value;
    const total = Number(document.getElementById("invoiceTotal").innerText);

    let invoiceNumber = document.getElementById("invoiceNumber").value;
    let invoiceId = editingId;

    const invoiceData = {
        customer_id: document.getElementById("invoiceCustomer").value,
        invoice_date: document.getElementById("invoiceDate").value,
        due_date: document.getElementById("invoiceDueDate").value,
        payment_terms: document.getElementById("invoiceTerms").value,
        notes: document.getElementById("invoiceNotes").value,
        total: total,
        balance: total,
        deleted: false
    };

    if (editingId) {
        const result = await db.from("invoices")
            .update(invoiceData)
            .eq("id", editingId)
            .select();

        if (result.error) {
            alert(result.error.message);
            return;
        }

        await db.from("invoice_items").delete().eq("invoice_id", editingId);
    } else {
        const counter = await db.from("invoice_counter").select("*").limit(1);
        invoiceNumber = counter.data[0].next_number;

        const result = await db.from("invoices")
            .insert([
                {
                    invoice_number: invoiceNumber,
                    ...invoiceData,
                    paid_amount: 0,
                    status: "Unpaid"
                }
            ])
            .select();

        if (result.error) {
            alert(result.error.message);
            return;
        }

        invoiceId = result.data[0].id;

        await db.from("invoice_counter")
            .update({
                next_number: Number(invoiceNumber) + 1
            })
            .eq("id", counter.data[0].id);
    }

    for (const item of invoiceItems) {
        await db.from("invoice_items")
            .insert([
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

    alert(editingId ? "Invoice updated" : "Invoice #" + invoiceNumber + " saved");

    closeInvoiceModal();

    invoiceItems = [];
    renderInvoiceItems();
    document.getElementById("invoiceNotes").value = "";

    await loadInvoiceNumber();
    await loadDashboard();
    await loadInvoices();
    await runReport();
}

async function loadInvoices() {
    const filter = document.getElementById("invoiceFilter")?.value || "all";

    let query = db.from("invoices")
        .select("*")
        .eq("deleted", false)
        .order("id", { ascending: false });

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
            <td>${MONEY}${total.toFixed(2)}</td>
            <td>${inv.status || "Unpaid"}</td>
            <td>
                <button class="primary" onclick="editInvoice(${inv.id})">Edit</button>
                <button class="success" onclick="markInvoicePaid(${inv.id})">Paid</button>
                <button class="secondary" onclick="printInvoicePdf(${inv.id})">PDF</button>
                <button class="danger" onclick="deleteInvoice(${inv.id}, ${inv.invoice_number})">Delete</button>
            </td>
        </tr>
        `;
    });

    document.getElementById("salesTotal").innerText = MONEY + sales.toFixed(2);
    document.getElementById("paidTotal").innerText = MONEY + paid.toFixed(2);
    document.getElementById("unpaidTotal").innerText = MONEY + unpaid.toFixed(2);
}

async function markInvoicePaid(id) {
    await db.from("invoices")
        .update({
            status: "Paid",
            paid_date: new Date().toISOString().split("T")[0],
            balance: 0
        })
        .eq("id", id);

    await loadInvoices();
    await loadDashboard();
    await runReport();
}

async function deleteInvoice(id, invoiceNumber) {
    if (!confirm("Delete this invoice?")) return;

    await db.from("invoices")
        .update({
            deleted: true
        })
        .eq("id", id);

    const counter = await db.from("invoice_counter").select("*").limit(1);

    if (counter.data && counter.data.length) {
        const next = Number(counter.data[0].next_number);

        if (Number(invoiceNumber) === next - 1) {
            await db.from("invoice_counter")
                .update({
                    next_number: Number(invoiceNumber)
                })
                .eq("id", counter.data[0].id);
        }
    }

    await loadInvoiceNumber();
    await loadInvoices();
    await loadDashboard();
    await runReport();
}

async function editInvoice(id) {
    const invoiceResult = await db.from("invoices")
        .select("*")
        .eq("id", id)
        .single();

    if (invoiceResult.error) {
        alert(invoiceResult.error.message);
        return;
    }

    const itemResult = await db.from("invoice_items")
        .select("*")
        .eq("invoice_id", id);

    const inv = invoiceResult.data;

    document.getElementById("invoiceModalTitle").innerText = "Edit Invoice";
    document.getElementById("saveInvoiceBtn").innerText = "Save Invoice";
    document.getElementById("editingInvoiceId").value = inv.id;
    document.getElementById("invoiceNumber").value = inv.invoice_number;
    document.getElementById("invoiceCustomer").value = inv.customer_id;
    document.getElementById("invoiceTerms").value = inv.payment_terms || "Net 30";
    document.getElementById("invoiceDate").value = inv.invoice_date || "";
    document.getElementById("invoiceDueDate").value = inv.due_date || "";
    document.getElementById("invoiceNotes").value = inv.notes || "";

    invoiceItems = (itemResult.data || []).map(item => ({
        product_id: item.product_id,
        description: item.description,
        quantity: Number(item.quantity || 0),
        unit_price: Number(item.unit_price || 0),
        line_total: Number(item.line_total || 0)
    }));

    renderInvoiceItems();
    updateTermsFromCustomer();
    openInvoiceModal();
}

async function printInvoicePdf(id) {
    const invoiceResult = await db.from("invoices")
        .select("*")
        .eq("id", id)
        .single();

    const itemResult = await db.from("invoice_items")
        .select("*")
        .eq("invoice_id", id);

    if (invoiceResult.error) {
        alert(invoiceResult.error.message);
        return;
    }

    const inv = invoiceResult.data;
    const customer = customersCache.find(c => String(c.id) === String(inv.customer_id)) || {};
    const company = companyCache || {};
    const items = itemResult.data || [];

    let rows = "";

    items.forEach(item => {
        rows += `
        <tr>
            <td>${item.description || ""}</td>
            <td>${item.quantity || ""}</td>
            <td>${MONEY}${Number(item.unit_price || 0).toFixed(2)}</td>
            <td>${MONEY}${Number(item.line_total || 0).toFixed(2)}</td>
        </tr>`;
    });

    const logo = company.company_logo
        ? `<img src="${company.company_logo}" style="max-width:140px;max-height:90px;margin-top:8px;">`
        : "";

    const html = `
    <html>
    <head>
    <title>Invoice ${inv.invoice_number}</title>
    <style>
        body{font-family:Arial;padding:30px;color:#111;}
        .page{page-break-after:always;}
        .top{display:flex;justify-content:space-between;align-items:flex-start;}
        table{width:100%;border-collapse:collapse;margin-top:25px;}
        th,td{border:1px solid #ccc;padding:10px;text-align:left;}
        th{background:#f3f4f6;}
        .total{text-align:right;font-size:24px;font-weight:bold;margin-top:20px;}
        .box{background:#f3f4f6;padding:15px;margin-top:20px;}
    </style>
    </head>
    <body>

    <div class="page">
        <div class="top">
            <div>
                <h1>${company.company_name || "Company"}</h1>
                ${logo}
                <p>${company.company_address || ""}</p>
                <p>${company.company_phone || ""}</p>
                <p>${company.company_email || ""}</p>
                <p>${company.website || ""}</p>
                <p>Tax ID: ${company.tax_id || ""}</p>
            </div>
            <div>
                <h2>INVOICE ORIGINAL</h2>
                <p><b>Invoice #:</b> ${inv.invoice_number}</p>
                <p><b>Date:</b> ${inv.invoice_date || ""}</p>
                <p><b>Due:</b> ${inv.due_date || ""}</p>
                <p><b>Status:</b> ${inv.status || ""}</p>
            </div>
        </div>

        <div class="box">
            <h3>Bill To</h3>
            <p><b>${customer.name || ""}</b></p>
            <p>${customer.address || ""}</p>
            <p>${customer.phone || ""}</p>
            <p>${customer.email || ""}</p>
            <p>Tax ID: ${customer.tax_id || ""}</p>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>

        <div class="total">Total: ${MONEY}${Number(inv.total || 0).toFixed(2)}</div>
        <p><b>Notes:</b> ${inv.notes || ""}</p>
    </div>

    <div class="page">
        <h1>DELIVERY NOTE COPY</h1>
        <p><b>Invoice #:</b> ${inv.invoice_number}</p>
        <p><b>Customer:</b> ${customer.name || ""}</p>
        <p><b>Date:</b> ${inv.invoice_date || ""}</p>

        <table>
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `<tr><td>${item.description || ""}</td><td>${item.quantity || ""}</td></tr>`).join("")}
            </tbody>
        </table>

        <br><br>
        <p>Received By: __________________________</p>
        <p>Signature: ____________________________</p>
    </div>

    <script>window.print();</script>
    </body>
    </html>
    `;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
}

async function runReport() {
    const customerId = document.getElementById("reportCustomer")?.value || "all";
    const startDate = document.getElementById("reportStartDate")?.value;
    const endDate = document.getElementById("reportEndDate")?.value;
    const status = document.getElementById("reportStatus")?.value || "all";
    const month = document.getElementById("reportMonth")?.value;
    const year = document.getElementById("reportYear")?.value;

    let query = db.from("invoices")
        .select("*")
        .eq("deleted", false);

    if (customerId !== "all") query = query.eq("customer_id", customerId);
    if (status !== "all") query = query.eq("status", status);
    if (startDate) query = query.gte("invoice_date", startDate);
    if (endDate) query = query.lte("invoice_date", endDate);

    const result = await query.order("invoice_date", { ascending: false });

    let invoices = result.data || [];

    if (month) {
        invoices = invoices.filter(inv => inv.invoice_date && inv.invoice_date.split("-")[1] === month);
    }

    if (year) {
        invoices = invoices.filter(inv => inv.invoice_date && inv.invoice_date.split("-")[0] === String(year));
    }

    let totalSales = 0;
    let paidSales = 0;
    let unpaidSales = 0;

    const body = document.getElementById("reportTableBody");
    if (!body) return;

    body.innerHTML = "";

    invoices.forEach(inv => {
        const total = Number(inv.total || 0);
        const customer = customersCache.find(c => String(c.id) === String(inv.customer_id));

        totalSales += total;

        if (inv.status === "Paid") {
            paidSales += total;
        } else {
            unpaidSales += total;
        }

        body.innerHTML += `
        <tr>
            <td>${inv.invoice_number}</td>
            <td>${customer ? customer.name : ""}</td>
            <td>${inv.invoice_date || ""}</td>
            <td>${inv.due_date || ""}</td>
            <td>${MONEY}${total.toFixed(2)}</td>
            <td>${inv.status || "Unpaid"}</td>
        </tr>
        `;
    });

    document.getElementById("reportTotalSales").innerText = MONEY + totalSales.toFixed(2);
    document.getElementById("reportPaidSales").innerText = MONEY + paidSales.toFixed(2);
    document.getElementById("reportUnpaidSales").innerText = MONEY + unpaidSales.toFixed(2);
    document.getElementById("reportInvoiceCount").innerText = invoices.length;
}
