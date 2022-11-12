export const numbersequences = {
    code: "text",
    name: "text",
    description: "text",
    currentnumber: "int",
}

export const countries = {
    name: "text",
    usdrate: "int8",
    currency: "text",
    symbol: "text",
    regionId: "int8",
    tableindex: ["currency", "usdrate"]
}

export const regions = {
    name: "text",
    continentId: "int8",
    code: "text",
    description: "text",
    tableindex: ["code", "name"]
}

export const markets = {
    name: "text",
    countryId: "int8",
    tableindex: ["countryid", "name"]
}


export const regionstates = {
    name: "text",
    countryId: "int8",
    tableindex: ["countryid", "name"]
}


export const cityareas = {
    name: "text",
    countryId: "int8",
    regionstateId: "int8",
    tableindex: ["countryid", "regionstateid", "name"]
}


export const towns = {
    name: "text",
    countryId: "int8",
    cityareaId: "int8",
    regionstateId: "int8",
    tableindex: ["countryid", "countryid", "regionstateid", "name"]
}


export const users = {
    role: "text",
    failed: "int",
    failedMax: "int",
    profileId: "int8",
    supervisorId: "int8",
    surname: "text",
    firstname: "text",
    username: "text",
    password: "text",
    mobile: "text",
    email: "text",
    image: "text",
    tableindex: ["profileid", "mobile", "email", "role"],
    tableunique: ["username"]
}

export const invites = {
    productId: "int8",
    planpartnerId: "int8",
    planId: "int8",
    surname: "text",
    firstname: "text",
    middlename: "text",
    mobile: "text",
    referrer: "text",
    email: "text",
    link: "text",
    invitedate: "timestamp",
    city: "text",
    address: "text",
    hasAcceptedTerms: "bool",
    hasAcceptedGdprData: "bool",
    companyAcknowledgementOrigin: "text",
    tableindex: ["productid", "surname", "firstname", "middlename", "mobile", "email", "link", "invitedate"],
}

export const infosessions = {
    surname: "text",
    firstname: "text",
    middlename: "text",
    mobile: "text",
    email: "text",
    mode: "text",
    invitedate: "timestamp",
    attendedate: "timestamp",
    tableindex: ["surname", "firstname", "middlename", "mobile", "email", "invitedate", "attendedate"],
}

export const trainingschedule = {
    profileId: "int8",
    productId: "int8",
    scheduledate: "text",
    scheduletime: "text",
    location: "text",
    mode: "text",
    assignedby: "text",
    facilitator: "text",
    purpose: "text",
    expirydate: "timestamp",

    tableindex: ["profileid", "productid", "scheduledate", "scheduletime", "location", "assignedby"]
}

export const cbtsessions = {
    code: "text",
    name: "text",
    trainingId: "int8",
    profileId: "int8",
    productId: "int8",
    moderatorId: "int8",
    username: "text",
    password: "text",
    link: "text",
    purpose: "text",
    expirydate: "date",
    startedtime: "text",
    finishedtime: "text",
    attempted: "int8",
    skipped: "int8",
    passed: "bool",
    failed: "bool",
    duration: "int8",
    score: "float",
    penalty: "text",
    total: "int8",

    tableindex: ["name", "code", "profileId", "productId", "moderatorId", "startedtime", "finishedtime", "attempted", "skipped", "passed", "failed", "duration", "score", "penalty", "total"]
}

export const activations = {
    type: "text",
    code: "text",
    name: "text",
    userId: "int8",
    vieweddate: "timestamp",
    expirydate: "timestamp",
    tableindex: ["userid", "name", "type", "code", "expirydate"]
}


export const sms = {
    code: "text",
    name: "text",
    url: "text",
    used: "int",
    units: "int",
    tableindex: ["code", "name", "code", "url"]
}

export const smtps = {
    code: "text",
    name: "text",
    server: "text",
    username: "text",
    password: "text",

    port: "int",
    rate: "int",
    delay: "int",

    tableindex: ["code", "name", "username", "password", "server"]
}


export const banks = {
    code: "text",
    name: "text",
    branch: "text",

    tableindex: ["code", "name", "branch"]
}

export const documenttypes = {
    code: "text",
    name: "text",
    category: "text",
    position: "int",
    issuedby: "text",
    isrequired: "bool",
    description: "text",
    tableindex: ["code", "name", "issuedby"]
}


///create products
export const products = {
    code: "text",
    name: "text",
    description: "text",
    tableindex: ["code", "name"]
}

export const productmarkets = {
    code: "text",
    name: "text",
    productId: "int8",
    selfonboard: "bool",
    description: "text",
    tableindex: ["code", "name", "productid"]
}

export const productcustomers = {
    code: "text",
    name: "text",
    productId: "int8",
    customerId: "int8",
    tableindex: ["code", "name", "productid", "customerid"]
}

export const requiredfields = {
    name: "text",
    category: "text",
    productId: "int8",
    ismandatory: "bool",
    allowoverride: "bool",
    description: "text",
    tableindex: ["name", "category", "productId", "description"]
}

export const planpartners = {
    code: "text",
    name: "text",
    type: "text",

    tableindex: ["name", "code", "type"]
}

export const driverplanpartners = {
    code: "text",
    name: "text",
    driverId: "int8",
    planPartnerId: "int8",

    tableindex: ["name", "driverId", "planPartnerId"]
}

export const marketplanpartners = {
    code: "text",
    name: "text",
    planPartnerId: "int8",

    tableindex: ["name", "planPartnerId"]
}

export const roleaccesslist = {
    code: "text",
    name: "text",
    role: "text",
    tableindex: ["code", "name", "role"]
}

export const marketlocations = {
    name: "text",
    address: "text",

    tableindex: ["name", "address"]
}

export const vehicleassignment = {
    code: "text",
    scheduledate: "text",
    scheduletime: "text",
    location: "text",
    tableindex: ["code", "location"]
}
