const SUPABASE_URL = "https://rbowvjsylgpdunpbrgye.supabase.co";
const SUPABASE_KEY = "sb_publishable_5ES5DIUJCJnFMLVQFFgl4g_2LIISqZF";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const MONEY = "฿";

function formatMoney(value) {
    return Number(value || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


let invoiceItems = [];
let customersCache = [];
let productsCache = [];
let companyCache = null;

document.addEventListener("DOMContentLoaded", async () => {

    hookupButtons();
    setToday();

    populateReportYears();
    toggleReportPeriod();

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
    document.getElementById("openProductModalBtn")?.addEventListener("click", openNewProductModal);

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

    document.getElementById("reportPeriodType")?.addEventListener(
        "change",
        toggleReportPeriod
    );
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
    document.getElementById("customerPriceCategory").value = "1";
    openCustomerModal();
}

function openProductModal() {
    document.getElementById("productModal").classList.add("show");
}

function closeProductModal() {
    document.getElementById("productModal").classList.remove("show");
}

function openNewProductModal() {
    document.getElementById("productModalTitle").innerText = "Add New Product";
    document.getElementById("editingProductId").value = "";
    document.getElementById("productName").value = "";
    document.getElementById("productPrice1").value = "";
    document.getElementById("productPrice2").value = "";
    document.getElementById("productPrice3").value = "";
    openProductModal();
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
    let days = 0;

    if (termsInput.value === "None") days = 0;
    if (termsInput.value === "COD") days = 0;
    if (termsInput.value === "Net 15") days = 15;
    if (termsInput.value === "Net 30") days = 30;
    if (termsInput.value === "Net 45") days = 45;
    if (termsInput.value === "Net 60") days = 60;

    start.setDate(start.getDate() + days);

    dueDateInput.value =
        start.toISOString().split("T")[0];
}

function updateTermsFromCustomer() {

    const customerId =
        document.getElementById("invoiceCustomer")?.value;

    const customer =
        customersCache.find(
            c => String(c.id) === String(customerId)
        );

    if (customer) {

        document.getElementById("invoiceTerms").value =
            customer.payment_terms || "None";

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
    document.getElementById("dashboardSalesTotal").innerText = MONEY + formatMoney(totalSales);
    document.getElementById("dashboardUnpaidCount").innerText = unpaidCount;
    document.getElementById("dashboardUnpaidTotal").innerText = MONEY + formatMoney(unpaidTotal);
}

async function saveCustomer() {
    const id = document.getElementById("editingCustomerId").value;
    const name = document.getElementById("customerName").value.trim();
    const phone = document.getElementById("customerPhone").value.trim();
    const email = document.getElementById("customerEmail").value.trim();
    const address = document.getElementById("customerAddress").value.trim();
    const payment_terms = document.getElementById("customerTerms").value;
    const tax_id = document.getElementById("customerTaxId").value.trim();
    const price_category = Number(document.getElementById("customerPriceCategory").value || 1);

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
        tax_id,
        price_category
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
                <td>${customer.price_category || 1}</td>
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
    const customer = customersCache.find(c => Number(c.id) === Number(id));

    if (!customer) return;

    document.getElementById("customerModalTitle").innerText = "Edit Customer";
    document.getElementById("editingCustomerId").value = customer.id;
    document.getElementById("customerName").value = customer.name || "";
    document.getElementById("customerPhone").value = customer.phone || "";
    document.getElementById("customerEmail").value = customer.email || "";
    document.getElementById("customerTaxId").value = customer.tax_id || "";
    document.getElementById("customerAddress").value = customer.address || "";
    document.getElementById("customerTerms").value = customer.payment_terms || "Net 30";
    document.getElementById("customerPriceCategory").value = customer.price_category || 1;

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
    await runReport();
}

async function saveProduct() {
    const id = document.getElementById("editingProductId").value;
    const name = document.getElementById("productName").value.trim();

    const price1 = document.getElementById("productPrice1").value;
    const price2 = document.getElementById("productPrice2").value;
    const price3 = document.getElementById("productPrice3").value;

    if (!name) {
        alert("Product name required");
        return;
    }

    let result;

    if (id) {
        result = await db.from("products")
            .update({
                name,
                price: Number(price1),
                price_1: Number(price1),
                price_2: Number(price2 || price1),
                price_3: Number(price3 || price1)
            })
            .eq("id", id);
    } else {
        result = await db.from("products")
            .insert([
                {
                    name,
                    price: Number(price1),
                    price_1: Number(price1),
                    price_2: Number(price2 || price1),
                    price_3: Number(price3 || price1)
                }
            ]);
    }

    if (result.error) {
        alert(result.error.message);
        return;
    }

    document.getElementById("editingProductId").value = "";
    document.getElementById("productName").value = "";
    document.getElementById("productPrice1").value = "";
    document.getElementById("productPrice2").value = "";
    document.getElementById("productPrice3").value = "";

    closeProductModal();

    await loadProducts();
    await loadDashboard();
}

async function loadProducts() {
    const result = await db.from("products").select("*").order("name");

    if (result.error) {
        alert(result.error.message);
        return;
    }

    productsCache = result.data || [];

    const table = document.getElementById("productTableBody");
    const select = document.getElementById("invoiceProduct");

    if (table) table.innerHTML = "";

    if (select) {
        select.innerHTML = `<option value="">Select Product</option>`;
    }

    productsCache.forEach(product => {
        if (table) {
            table.innerHTML += `
            <tr>
    <td>${product.name}</td>
    <td>${MONEY}${Number(product.price_1 || product.price || 0).toFixed(2)}</td>
    <td>${MONEY}${Number(product.price_2 || product.price || 0).toFixed(2)}</td>
    <td>${MONEY}${Number(product.price_3 || product.price || 0).toFixed(2)}</td>
    <td>
        <button class="primary" onclick="editProduct(${product.id})">Edit</button>
        <button class="danger" onclick="deleteProduct(${product.id})">Delete</button>
    </td>
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

function editProduct(id) {

    const product =
        productsCache.find(
            p => Number(p.id) === Number(id)
        );

    if (!product) return;

    document.getElementById("productModalTitle").innerText =
        "Edit Product";

    document.getElementById("editingProductId").value =
        product.id;

    document.getElementById("productName").value =
        product.name || "";

    document.getElementById("productPrice").value =
        product.price || "";

    openProductModal();
}

async function deleteProduct(id) {

    if (!confirm("Delete this product?"))
        return;

    const result =
        await db
        .from("products")
        .delete()
        .eq("id", id);

    if (result.error) {
        alert(result.error.message);
        return;
    }

    await loadProducts();
    await loadDashboard();
}

function editProduct(id) {
    const product = productsCache.find(p => Number(p.id) === Number(id));

    if (!product) {
        alert("Product not found");
        return;
    }

    document.getElementById("editingProductId").value = product.id;
    document.getElementById("productName").value = product.name || "";
    document.getElementById("productPrice").value = product.price || "";

    showPage("products");
}

async function deleteProduct(id) {
    if (!confirm("Delete this product?")) return;

    const result = await db.from("products").delete().eq("id", id);

    if (result.error) {
        alert(result.error.message);
        return;
    }

    await loadProducts();
    await loadDashboard();
}

function editProduct(id) {

    const product =
        productsCache.find(
            p => Number(p.id) === Number(id)
        );

    if (!product) return;

    document.getElementById("productModalTitle").innerText =
        "Edit Product";

    document.getElementById("editingProductId").value =
        product.id;

    document.getElementById("productName").value =
        product.name || "";

    document.getElementById("productPrice1").value =
        product.price_1 || product.price || "";

    document.getElementById("productPrice2").value =
        product.price_2 || product.price || "";

    document.getElementById("productPrice3").value =
        product.price_3 || product.price || "";

    openProductModal();
}

async function deleteProduct(id) {

    if (!confirm("Delete this product?"))
        return;

    const result =
        await db
        .from("products")
        .delete()
        .eq("id", id);

    if (result.error) {
        alert(result.error.message);
        return;
    }

    await loadProducts();
    await loadDashboard();
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

    
    await loadCompanyProfile();
}

async function loadCompanyProfile() {
    const result = await db.from("company_settings").select("*").limit(1);

    if (!result.data || !result.data.length) return;

    companyCache = result.data[0];

    const companyName = document.getElementById("companyName");
    const companyPhone = document.getElementById("companyPhone");
    const companyEmail = document.getElementById("companyEmail");
    const companyAddress = document.getElementById("companyAddress");
    const companyWebsite = document.getElementById("companyWebsite");
    const taxId = document.getElementById("taxId");
    const companyLogo = document.getElementById("companyLogo");

    if (companyName) companyName.value = companyCache.company_name || "";
    if (companyPhone) companyPhone.value = companyCache.company_phone || "";
    if (companyEmail) companyEmail.value = companyCache.company_email || "";
    if (companyAddress) companyAddress.value = companyCache.company_address || "";
    if (companyWebsite) companyWebsite.value = companyCache.website || "";
    if (taxId) taxId.value = companyCache.tax_id || "";
    if (companyLogo) companyLogo.value = companyCache.company_logo || "";
}

async function loadInvoiceNumber() {
    const result = await db.from("invoice_counter").select("*").limit(1);

    const invoiceNumber =
        document.getElementById("invoiceNumber");

    if (!invoiceNumber) return;

    if (result.error || !result.data || result.data.length === 0) {
        invoiceNumber.value = "1000";
        return;
    }

    invoiceNumber.value = result.data[0].next_number;
}

function addInvoiceItem() {

    const customerId =
        document.getElementById("invoiceCustomer").value;

    const customer =
        customersCache.find(
            c => Number(c.id) === Number(customerId)
        );

    const category =
        Number(customer?.price_category || 1);

    const productId =
        document.getElementById("invoiceProduct").value;

    const product =
        productsCache.find(
            p => Number(p.id) === Number(productId)
        );

    if (!product) {
        alert("Select product");
        return;
    }

    const qty =
        Number(
            document.getElementById("invoiceQty").value || 1
        );

    let price = 0;

    if (category === 1) {
        price = Number(product.price_1 || product.price || 0);
    }

    if (category === 2) {
        price = Number(product.price_2 || product.price || 0);
    }

    if (category === 3) {
        price = Number(product.price_3 || product.price || 0);
    }

    invoiceItems.push({
        product_id: product.id,
        description: product.name,
        quantity: qty,
        unit_price: price,
        line_total: qty * price
    });

    renderInvoiceItems();
}

function removeInvoiceItem(index) {
    invoiceItems.splice(index, 1);
    renderInvoiceItems();
}

function renderInvoiceItems() {

    const body =
        document.getElementById("invoiceItemsBody");

    body.innerHTML = "";

    let grandTotal = 0;

    invoiceItems.forEach((item, index) => {

        item.line_total =
            Number(item.quantity) *
            Number(item.unit_price);

        grandTotal += Number(item.line_total || 0);

        body.innerHTML += `
        <tr>

            <td>${item.description}</td>

            <td>
                <input
                    type="number"
                    value="${item.quantity}"
                    min="1"
                    onchange="
                        invoiceItems[${index}].quantity =
                        Number(this.value);
                        renderInvoiceItems();
                    ">
            </td>

            <td>
                <input
                    type="number"
                    value="${item.unit_price}"
                    step="0.01"
                    onchange="
                        invoiceItems[${index}].unit_price =
                        Number(this.value);
                        renderInvoiceItems();
                    ">
            </td>

            <td>
    ${MONEY}${Number(item.line_total).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}
</td>

            <td>
                <button
                    class="danger"
                    onclick="removeInvoiceItem(${index})">
                    X
                </button>
            </td>

        </tr>
        `;
    });

    document.getElementById("invoiceTotal").innerText =
        grandTotal.toFixed(2);
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


closeInvoiceModal();

invoiceItems = [];
renderInvoiceItems();

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
        const customer = customersCache.find(c => Number(c.id) === Number(inv.customer_id));
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
            <td>${formatDateDDMMYYYY(inv.invoice_date)}</td>
            <td>${formatDateDDMMYYYY(inv.due_date)}</td>
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

    document.getElementById("salesTotal").innerText =
    MONEY + formatMoney(sales);

document.getElementById("paidTotal").innerText =
    MONEY + formatMoney(paid);

document.getElementById("unpaidTotal").innerText =
    MONEY + formatMoney(unpaid);
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
document.getElementById("invoiceTerms").value = inv.payment_terms || "None";
document.getElementById("invoiceDate").value = inv.invoice_date || "";
document.getElementById("invoiceDueDate").value = inv.due_date || "";

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
    const customer = customersCache.find(c => Number(c.id) === Number(inv.customer_id)) || {};
    const company = companyCache || {};
    const items = itemResult.data || [];

    const formatMoney = (amount) => {
        return Number(amount || 0).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const cleanAddress = (customer.address || "")
        .split(/tel\.|phone:|fax\.|e-mail\.|email:/i)[0]
        .trim();

    const buildInvoiceRows = (pageItems) => {
    let html = "";

    pageItems.forEach(item => {
        html += `
        <tr>
            <td>${item.description || ""}</td>
            <td>${item.quantity || ""}</td>
            <td>${MONEY}${formatMoney(item.unit_price || 0)}</td>
            <td>${MONEY}${formatMoney(item.line_total || 0)}</td>
        </tr>`;
    });

    return html;
};

const buildDeliveryRows = (pageItems) => {
    let html = "";

    pageItems.forEach(item => {
        html += `
        <tr>
            <td>${item.description || ""}</td>
            <td>${item.quantity || ""}</td>
        </tr>`;
    });

    return html;
};

const splitItemsIntoPages = (allItems, firstPageLimit, nextPageLimit) => {
    const pages = [];

    pages.push(allItems.slice(0, firstPageLimit));

    let index = firstPageLimit;

    while (index < allItems.length) {
        pages.push(allItems.slice(index, index + nextPageLimit));
        index += nextPageLimit;
    }

    return pages;
};

const invoicePages = splitItemsIntoPages(items, 8, 12);
const deliveryPages = splitItemsIntoPages(items, 12, 16);

const rows = buildInvoiceRows(invoicePages[0] || []);
const deliveryRows = buildDeliveryRows(deliveryPages[0] || []);

const invoiceTotalHtml = `
<div class="total-box">
    <div class="total-inner">
        Total: ${MONEY}${formatMoney(inv.total || 0)}
    </div>
</div>
`;

const deliverySignatureHtml = `
<div class="signature-box">
    <p>Received By: __________________________</p>
    <p>Signature: ____________________________</p>
</div>
`;

const mainInvoiceTotal =
    invoicePages.length === 1 ? invoiceTotalHtml : "";

const mainDeliverySignature =
    deliveryPages.length === 1 ? deliverySignatureHtml : "";

const invoiceContinuationPages = invoicePages.slice(1).map((pageItems, index, arr) => {
    const isLastInvoicePage = index === arr.length - 1;

    return `
<div class="page continuation-page">
    <div class="continuation-title">
        INVOICE CONTINUED
    </div>

    <table>
        <thead>
            <tr>
                <th>Item</th>
                <th style="width:90px;">Qty</th>
                <th style="width:110px;">Price</th>
                <th style="width:110px;">Total</th>
            </tr>
        </thead>

        <tbody>
            ${buildInvoiceRows(pageItems)}
        </tbody>
    </table>

    ${isLastInvoicePage ? invoiceTotalHtml : ""}
</div>
`;
}).join("");

const deliveryContinuationPages = deliveryPages.slice(1).map((pageItems, index, arr) => {
    const isLastDeliveryPage = index === arr.length - 1;

    return `
<div class="page delivery-page">
    <div class="delivery-title">
        DELIVERY NOTE COPY
    </div>

    <table>
        <thead>
            <tr>
                <th>Item</th>
                <th style="width:90px;">Qty</th>
            </tr>
        </thead>

        <tbody>
            ${buildDeliveryRows(pageItems)}
        </tbody>
    </table>

    ${isLastDeliveryPage ? deliverySignatureHtml : ""}
</div>
`;
}).join("");
    
const html = `
<html>
<head>
<title>Invoice ${inv.invoice_number}</title>

<style>
body{
    font-family:Arial, sans-serif;
    padding:20px;
    color:#111827;
    background:white;
}

.pdf-content{
    width:7.5in;
    margin:0 auto;
    background:white;
}

.page{
    width:100%;
    min-height:auto;
    padding:0.25in;
    box-sizing:border-box;
    page-break-after:auto;
    background:white;
    margin:0;
    position:relative;
    left:0;
}

.delivery-page{
    page-break-before:always;
    break-before:page;
}

.continuation-page{
    page-break-before:always;
    break-before:page;
}

.invoice-header{
    display:grid;
    grid-template-columns:1fr 240px;
    gap:24px;
    align-items:start;
    border-bottom:4px solid #111827;
    padding-bottom:14px;
    margin-bottom:18px;
}

.company-card{
    max-width:none;
}

.company-name{
    font-size:30px;
    font-weight:900;
    margin:0 0 8px 0;
    color:#111827;
    letter-spacing:4px;
    line-height:1.15;
}

.company-info{
    font-size:15px;
    line-height:1.35;
    color:#374151;
}

.company-info div{
    margin:2px 0;
}

.invoice-card{
    background:transparent;
    border-radius:0;
    padding:0;
    min-width:0;
    text-align:left;
    margin-top:4px;
}

.invoice-title{
    font-size:20px;
    font-weight:900;
    margin:0 0 14px 0;
    color:#111827;
    line-height:1.25;
    letter-spacing:2px;
}

.invoice-small-meta{
    margin-top:0;
    font-size:18px;
}

.invoice-small-meta div{
    display:grid;
    grid-template-columns:70px 1fr;
    margin:8px 0;
    align-items:center;
}

.invoice-small-meta b{
    font-weight:900;
    color:#000000;
}

.invoice-small-meta span{
    color:#111827;
    font-weight:500;
}

.invoice-meta-row{
    display:grid;
    grid-template-columns:repeat(3,1fr);
    margin:20px 0 28px 0;
    border:2px solid #111827;
    border-radius:8px;
    overflow:hidden;
    background:#ffffff;
}

.invoice-meta-row div{
    text-align:center;
    padding:12px 10px;
    border-right:1px solid #d1d5db;
}

.invoice-meta-row div:last-child{
    border-right:none;
}

.invoice-meta-row span{
    display:block;
    font-size:13px;
    color:#374151;
    text-transform:uppercase;
    letter-spacing:.4px;
    margin-bottom:5px;
}

.invoice-meta-row b{
    display:block;
    font-size:16px;
    color:#111827;
    font-weight:800;
}

.bill-card{
    background:#f9fafb;
    border:1px solid #e5e7eb;
    border-radius:12px;
    padding:18px 20px;
    margin:0 0 24px 0;
}

.section-title{
    font-size:20px;
    font-weight:900;
    margin:0 0 12px 0;
    color:#111827;
}

.customer-name{
    font-size:17px;
    font-weight:900;
    margin-bottom:16px;
}

.customer-grid{
    display:grid;
    grid-template-columns:48% 52%;
    gap:18px;
    align-items:start;
}

.customer-address{
    display:flex;
    gap:12px;
    align-items:flex-start;
    padding-right:22px;
    border-right:1px solid #d1d5db;
}

.address-icon{
    font-size:16px;
    line-height:1;
    margin-top:5px;
    flex-shrink:0;
}

.address-text{
    font-size:15px;
    line-height:1.8;
    color:#111827;
    width:100%;
}

.customer-contact{
    display:flex;
    flex-direction:column;
    gap:16px;
    padding-left:8px;
}

.contact-row{
    display:grid;
    grid-template-columns:22px 70px minmax(0,1fr);
    align-items:center;
    column-gap:8px;
}

.contact-icon{
    font-size:15px;
    text-align:center;
    width:24px;
}

.contact-label{
    font-size:15px;
    font-weight:700;
    color:#111827;
    white-space:nowrap;
}

.contact-value{
    font-size:15px;
    color:#111827;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
}

table{
    width:100%;
    border-collapse:collapse;
    margin-top:18px;
    font-size:14px;
}

th{
    background:#111827;
    color:white;
    padding:12px;
    text-align:left;
    border:1px solid #111827;
    font-weight:800;
}

td{
    padding:12px;
    border:1px solid #d1d5db;
}

tbody tr:nth-child(even){
    background:#f9fafb;
}

thead{
    display:table-row-group;
}

tr{
    page-break-inside:avoid;
    break-inside:avoid;
}

td,
th{
    page-break-inside:avoid;
    break-inside:avoid;
}

.total-box{
    margin-top:22px;
    text-align:right;
    padding-right:0;
}

.total-inner{
    display:inline-block;
    text-align:right;
    background:transparent;
    color:#000000;
    padding:0;
    border-radius:0;
    font-size:24px;
    font-weight:900;
    min-width:auto;
    border:none;
}

.continuation-title{
    font-size:26px;
    font-weight:900;
    text-align:center;
    margin:25px 0 25px 0;
    color:#111827;
    letter-spacing:2px;
}

.delivery-title{
    font-size:34px;
    font-weight:900;
    text-align:center;
    margin:35px 0 18px 0;
    color:#111827;
}

.delivery-info-card{
    max-width:520px;
    margin:0 auto 32px auto;
}

.delivery-info-card p{
    margin:10px 0;
    font-size:15px;
}

.signature-box{
    margin:45px auto 0 auto;
    border:1px solid #d1d5db;
    border-radius:12px;
    padding:22px 26px;
    max-width:620px;
    font-size:16px;
    line-height:2.2;
}

@media print{
    body{
        padding:25px;
    }

    table{
        margin-top:20px;
    }
}
</style>

<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
</head>

<body>

<div class="pdf-toolbar">
    <button onclick="downloadPdf()">Download PDF</button>
</div>

<div class="pdf-content">

<div class="page">

    <div class="invoice-header">
        <div class="company-card">
            <div class="company-name">
                ${company.company_name || "Company"}
            </div>

            <div class="company-info">
                <div>${company.company_address || ""}</div>
                <div>${company.company_phone || ""}</div>
                <div>${company.company_email || ""}</div>
                <div>Tax ID: ${company.tax_id || ""}</div>
            </div>
        </div>

        <div class="invoice-card">
    <div class="invoice-title">
        INVOICE ORIGINAL #${inv.invoice_number}
    </div>

    <div class="invoice-small-meta">
        <div>
            <b>Date</b>
            <span>${formatDateDDMMYYYY(inv.invoice_date)}</span>
        </div>
    </div>
</div>

    <div class="bill-card">
        <div class="section-title">Bill To</div>

        <div class="customer-name">
            ${customer.name || ""}
        </div>

        <div class="customer-grid">

            <div class="customer-address">
                <div class="address-icon">📍</div>

                <div class="address-text">
                    ${cleanAddress}
                </div>
            </div>

            <div class="customer-contact">

                <div class="contact-row">
                    <span class="contact-icon">🪪</span>
                    <span class="contact-label">Tax ID:</span>
                    <span class="contact-value">${customer.tax_id || ""}</span>
                </div>

                <div class="contact-row">
                    <span class="contact-icon">☎</span>
                    <span class="contact-label">Phone:</span>
                    <span class="contact-value">${customer.phone || ((customer.address || "").match(/tel\.?\s*([^fE]+)/i)?.[1] || "").trim()}</span>
                </div>

                <div class="contact-row">
                    <span class="contact-icon">🖨</span>
                    <span class="contact-label">Fax:</span>
                    <span class="contact-value">${customer.fax || ((customer.address || "").match(/fax\.?\s*([^E]+)/i)?.[1] || "").trim()}</span>
                </div>

                <div class="contact-row">
                    <span class="contact-icon">✉</span>
                    <span class="contact-label">Email:</span>
                    <span class="contact-value">${customer.email || ((customer.address || "").match(/(?:e-mail\.?|email:?)\s*(.*)/i)?.[1] || "").replace(/^fs\s+/i, "").trim()}</span>
                </div>
            </div>

        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Item</th>
                <th style="width:90px;">Qty</th>
                <th style="width:110px;">Price</th>
                <th style="width:110px;">Total</th>
            </tr>
        </thead>

        <tbody>
            ${rows}
        </tbody>
    </table>

    ${mainInvoiceTotal}

</div>

${invoiceContinuationPages}

<div class="page delivery-page">

    <div class="delivery-title">
        DELIVERY NOTE COPY
    </div>

    <div class="bill-card delivery-info-card">
        <p><b>Invoice #:</b> ${inv.invoice_number}</p>
        <p><b>Customer:</b> ${customer.name || ""}</p>
        <p><b>Date:</b> ${formatDateDDMMYYYY(inv.invoice_date)}</p>
    </div>

    <table>
        <thead>
            <tr>
                <th>Item</th>
                <th style="width:120px;">Qty</th>
            </tr>
        </thead>

        <tbody>
            ${deliveryRows}
        </tbody>
    </table>

    ${mainDeliverySignature}

</div>

${deliveryContinuationPages}

</div>
<script>
function downloadPdf() {


    const invoicePage =
    document.querySelector(".pdf-content");

    html2pdf()
    .set({
        margin: [0.55, 0.45, 0.35, 0.45],
            filename: "Invoice-${inv.invoice_number}.pdf",
            image: {
                type: "jpeg",
                quality: 0.98
            },
            html2canvas: {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff"
},
pagebreak: {
    mode: ["css"]
},
            jsPDF: {
                unit: "in",
                format: "letter",
                orientation: "portrait"
            }
        })
        .from(invoicePage)
        .save();
}
</script>

    </body>
    </html>
    `;

   const win = window.open("", "_blank");

win.document.open();
win.document.write(html);
win.document.close();
}

 async function runReport() {

    const customerId =
        document.getElementById("reportCustomer")?.value || "all";

    const status =
        document.getElementById("reportStatus")?.value || "all";

    const periodType =
        document.getElementById("reportPeriodType")?.value || "year";

    let startDate = "";
    let endDate = "";

    if (periodType === "month") {

        const month =
            document.getElementById("reportMonth")?.value;

        const year =
            document.getElementById("reportYear")?.value;

        if (month && year) {

            startDate = `${year}-${month}-01`;

            const lastDay =
                new Date(
                    Number(year),
                    Number(month),
                    0
                ).getDate();

            endDate =
                `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
        }
    }

    if (periodType === "year") {

        const year =
            document.getElementById("reportYearOnly")?.value;

        if (year) {

            startDate = `${year}-01-01`;
            endDate = `${year}-12-31`;
        }
    }

    if (periodType === "dates") {

        startDate =
            document.getElementById("reportStartDate")?.value;

        endDate =
            document.getElementById("reportEndDate")?.value;
    }

    let query = db
        .from("invoices")
        .select("*")
        .eq("deleted", false);

    if (customerId !== "all") {
        query = query.eq("customer_id", customerId);
    }

    if (status !== "all") {
        query = query.eq("status", status);
    }

    if (startDate) {
        query = query.gte("invoice_date", startDate);
    }

    if (endDate) {
        query = query.lte("invoice_date", endDate);
    }

    const result =
        await query.order(
            "invoice_date",
            { ascending: false }
        );

    if (result.error) {
        alert(result.error.message);
        return;
    }

    const invoices = result.data || [];

    let totalSales = 0;
    let paidSales = 0;
    let unpaidSales = 0;

    const body =
        document.getElementById("reportTableBody");

if (!body) return;

body.innerHTML = "";

invoices.forEach(inv => {

    const total =
        Number(inv.total || 0);

    const customer =
        customersCache.find(
            c => Number(c.id) === Number(inv.customer_id)
        );

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
        <td>${formatDateDDMMYYYY(inv.invoice_date)}</td>
        <td>${formatDateDDMMYYYY(inv.due_date)}</td>
        <td>${MONEY}${total.toFixed(2)}</td>
        <td>${inv.status || "Unpaid"}</td>
    </tr>
    `;
});

document.getElementById("reportTotalSales").innerText =
    MONEY + formatMoney(totalSales);

document.getElementById("reportPaidSales").innerText =
    MONEY + formatMoney(paidSales);

document.getElementById("reportUnpaidSales").innerText =
    MONEY + formatMoney(unpaidSales);

document.getElementById("reportInvoiceCount").innerText =
    invoices.length;
}

function toggleReportPeriod() {

    const periodType =
        document.getElementById("reportPeriodType")?.value;

    const monthBox =
        document.getElementById("reportMonthBox");

    const yearBox =
        document.getElementById("reportYearBox");

    const dateBox =
        document.getElementById("reportDateBox");

    if (periodType === "month") {

        monthBox.style.display = "grid";
        yearBox.style.display = "none";
        dateBox.style.display = "none";

    }
    else if (periodType === "year") {

        monthBox.style.display = "none";
        yearBox.style.display = "grid";
        dateBox.style.display = "none";

    }
    else {

        monthBox.style.display = "none";
        yearBox.style.display = "none";
        dateBox.style.display = "grid";

    }
}

function populateReportYears() {

    const reportYear =
        document.getElementById("reportYear");

    const reportYearOnly =
        document.getElementById("reportYearOnly");

    const currentYear =
        new Date().getFullYear();

    if (reportYear) {
        reportYear.innerHTML = "";
    }

    if (reportYearOnly) {
        reportYearOnly.innerHTML = "";
    }

    for (
        let year = currentYear + 1;
        year >= currentYear - 5;
        year--
    ) {

        const option = `
        <option value="${year}">
            ${year}
        </option>
        `;

        if (reportYear) {
            reportYear.innerHTML += option;
        }

        if (reportYearOnly) {
            reportYearOnly.innerHTML += option;
        }
    }

    if (reportYear) {
        reportYear.value = currentYear;
    }

    if (reportYearOnly) {
        reportYearOnly.value = currentYear;
    }
}

function formatDateDDMMYYYY(dateValue) {

    if (!dateValue) return "";

    const parts = dateValue.split("-");

    if (parts.length !== 3) {
        return dateValue;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
