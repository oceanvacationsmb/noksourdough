const SUPABASE_URL = "https://rbowvjsylgpdunpbrgye.supabase.co";
const SUPABASE_KEY = "sb_publishable_5ES5DIUJCJnFMLVQFFgl4g_2LIISqZF";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let invoiceItems = [];

document.addEventListener("DOMContentLoaded", async () => {

    hookupButtons();

    await loadDashboard();
    await loadCustomers();
    await loadProducts();
    await loadCompanyProfile();
    await loadInvoiceNumber();

});

function hookupButtons() {

    document
        .getElementById("saveCustomerBtn")
        ?.addEventListener("click", saveCustomer);

    document
        .getElementById("saveProductBtn")
        ?.addEventListener("click", saveProduct);

    document
        .getElementById("saveCompanyBtn")
        ?.addEventListener("click", saveCompany);

    document
        .getElementById("addItemBtn")
        ?.addEventListener("click", addInvoiceItem);

    document
        .getElementById("saveInvoiceBtn")
        ?.addEventListener("click", saveInvoice);

}

async function loadDashboard() {

    const customers =
        await db.from("customers")
        .select("*", { count: "exact", head: true });

    const products =
        await db.from("products")
        .select("*", { count: "exact", head: true });

    const invoices =
        await db.from("invoices")
        .select("*", { count: "exact", head: true });

    document.getElementById("customersCount").innerText =
        customers.count || 0;

    document.getElementById("productsCount").innerText =
        products.count || 0;

    document.getElementById("invoicesCount").innerText =
        invoices.count || 0;

}

async function saveCustomer() {

    const name =
        document.getElementById("customerName").value;

    const phone =
        document.getElementById("customerPhone").value;

    const email =
        document.getElementById("customerEmail").value;

    const address =
        document.getElementById("customerAddress").value;

    const terms =
        document.getElementById("customerTerms").value;

    const result =
        await db
        .from("customers")
        .insert([
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

    loadCustomers();
    loadDashboard();
}

async function loadCustomers() {

    const result =
        await db
        .from("customers")
        .select("*")
        .order("name");

    const table =
        document.getElementById("customerTableBody");

    const select =
        document.getElementById("invoiceCustomer");

    if (table) table.innerHTML = "";
    if (select) select.innerHTML = "";

    result.data.forEach(customer => {

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

}

async function saveProduct() {

    const name =
        document.getElementById("productName").value;

    const price =
        document.getElementById("productPrice").value;

    const result =
        await db
        .from("products")
        .insert([
            {
                name,
                price
            }
        ]);

    if (result.error) {
        alert(result.error.message);
        return;
    }

    alert("Product saved");

    loadProducts();
    loadDashboard();
}

async function loadProducts() {

    const result =
        await db
        .from("products")
        .select("*")
        .order("name");

    const table =
        document.getElementById("productTableBody");

    const select =
        document.getElementById("invoiceProduct");

    if (table) table.innerHTML = "";
    if (select) select.innerHTML = "";

    result.data.forEach(product => {

        if (table) {

            table.innerHTML += `
            <tr>
            <td>${product.name}</td>
            <td>$${product.price}</td>
            </tr>
            `;

        }

        if (select) {

            select.innerHTML += `
            <option
            value="${product.id}"
            data-price="${product.price}">
            ${product.name}
            </option>
            `;

        }

    });

}

async function saveCompany() {

    const company_name =
        document.getElementById("companyName").value;

    const company_phone =
        document.getElementById("companyPhone").value;

    const company_email =
        document.getElementById("companyEmail").value;

    const company_address =
        document.getElementById("companyAddress").value;

    const website =
        document.getElementById("companyWebsite").value;

    const tax_id =
        document.getElementById("taxId").value;

    const company_logo =
        document.getElementById("companyLogo").value;

    const existing =
        await db
        .from("company_settings")
        .select("*")
        .limit(1);

    if (existing.data.length) {

        await db
        .from("company_settings")
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

        await db
        .from("company_settings")
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
}

async function loadCompanyProfile() {

    const result =
        await db
        .from("company_settings")
        .select("*")
        .limit(1);

    if (!result.data.length) return;

    const c = result.data[0];

    companyName.value = c.company_name || "";
    companyPhone.value = c.company_phone || "";
    companyEmail.value = c.company_email || "";
    companyAddress.value = c.company_address || "";
    companyWebsite.value = c.website || "";
    taxId.value = c.tax_id || "";
    companyLogo.value = c.company_logo || "";

}

async function loadInvoiceNumber() {

    const { data, error } =
    await db
    .from("invoice_counter")
    .select("*")
    .limit(1);

    console.log("invoice counter", data);
    console.log("invoice error", error);

    if (error) {
        alert(error.message);
        return;
    }

    if (!data || data.length === 0) {

        document.getElementById("invoiceNumber").value = 1000;

        return;
    }

    document.getElementById("invoiceNumber").value =
        data[0].next_number;
}
            ]);

        document.getElementById("invoiceNumber").value = 1000;

        return;
    }

    document.getElementById("invoiceNumber").value =
        result.data[0].next_number;

}

function addInvoiceItem() {

    const select =
        document.getElementById("invoiceProduct");

    const option =
        select.options[select.selectedIndex];

    const qty =
        Number(
            document.getElementById("invoiceQty").value
        );

    const price =
        Number(option.dataset.price);

    const total =
        qty * price;

    invoiceItems.push({
        product_id: option.value,
        description: option.text,
        quantity: qty,
        unit_price: price,
        line_total: total
    });

    renderInvoiceItems();
}

function renderInvoiceItems() {

    const body =
        document.getElementById("invoiceItemsBody");

    body.innerHTML = "";

    let grandTotal = 0;

    invoiceItems.forEach(item => {

        grandTotal += item.line_total;

        body.innerHTML += `
        <tr>
        <td>${item.description}</td>
        <td>${item.quantity}</td>
        <td>$${item.unit_price}</td>
        <td>$${item.line_total}</td>
        </tr>
        `;

    });

    document.getElementById("invoiceTotal")
        .innerText =
        grandTotal.toFixed(2);

}

async function saveInvoice() {

    const counter =
        await db
        .from("invoice_counter")
        .select("*")
        .limit(1);

    const invoiceNumber =
        counter.data[0].next_number;

    const total =
        Number(
            document.getElementById("invoiceTotal")
            .innerText
        );

    const invoice =
        await db
        .from("invoices")
        .insert([
            {
                invoice_number: invoiceNumber,
                customer_id:
                    document.getElementById("invoiceCustomer").value,
                invoice_date:
                    document.getElementById("invoiceDate").value,
                due_date:
                    document.getElementById("invoiceDueDate").value,
                payment_terms:
                    document.getElementById("invoiceTerms").value,
                notes:
                    document.getElementById("invoiceNotes").value,
                total: total,
                status: "Unpaid"
            }
        ])
        .select();

    const invoiceId =
        invoice.data[0].id;

    for (const item of invoiceItems) {

        await db
        .from("invoice_items")
        .insert([
            {
                invoice_id: invoiceId,
                ...item
            }
        ]);

    }

    await db
        .from("invoice_counter")
        .update({
            next_number:
                invoiceNumber + 1
        })
        .eq(
            "id",
            counter.data[0].id
        );

    alert(
        "Invoice #" +
        invoiceNumber +
        " saved"
    );

    invoiceItems = [];

    renderInvoiceItems();

    loadInvoiceNumber();
    loadDashboard();
}
