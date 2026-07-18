import fetch from 'node-fetch';

async function testClaim() {
    // 1. Get Token using Anteraja SSO
    const loginUrl = 'https://cas.anteraja.id/api/login';
    const loginPayload = {
        username: "240320-0010-001",
        password: "Password123"
    };

    const loginRes = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload)
    });
    const loginData = await loginRes.json();
    const ssoToken = loginData.token;

    const authUrl = 'https://api.anteraja.id/maa-task/user/auth';
    const authRes = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: ssoToken })
    });
    const authData = await authRes.json();
    const token = authData.token;

    console.log("Token:", token.substring(0, 15) + "...");

    // Let's first search to get an AWB we can claim
    const searchUrl = 'https://api.anteraja.id/maa-task/order/v2/search/10008581696541';
    const searchRes = await fetch(searchUrl, {
        method: 'GET',
        headers: {
            'token': token,
            'source': 'MAA',
            'agent_staff_id': '240320-0010'
        }
    });
    const searchData = await searchRes.json();
    console.log("Search Result Status:", searchData.status);
    console.log("Search Result Info:", searchData.info);
    
    if (searchData.status === 0 && searchData.content && searchData.content.length > 0) {
        const awb = searchData.content[0].waybill;
        console.log("Found AWB to claim:", awb);
        
        // 2. Try Claiming the AWB
        const apiBase = 'https://api.anteraja.id/maa-task';
        const url = `${apiBase}/order/v2/claim/${encodeURIComponent(awb)}`;
        
        // Payload matching Android MaaClaimTaskRequestBody
        const payload = {
            agentId: "240320-0010",
            orders: [
                {
                    orderSource: "B2B",
                    claimKey: awb
                }
            ]
        };
        
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'token': token,
            'appid': 'JV_APP',
            'msgid': Date.now().toString(),
            'imei': 'dev_device_uuid_12345',
            'deviceUuid': 'dev_device_uuid_12345',
            'hardwareSerialNo': 'dev_serial',
            'manufacture': 'Apple',
            'model': 'Macbook',
            'os': 'macOS',
            'osVersion': '14.0',
            'appVersion': '2.2.4',
            'mv': '1.1',
            'source': 'MAA',
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });
        
        const data = await response.text();
        console.log("Claim Status:", response.status);
        console.log("Claim Response:", data);
    } else {
        console.log("No AWB found to claim or search failed.");
    }
}
testClaim();
