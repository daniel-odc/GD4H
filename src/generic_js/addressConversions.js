/* --------------------------------------------------
*   Module using the BAN (Base Adresse Nationale) API to convert addresses to lat, lng
*   
*   Features:
*   - Converts CSV files with address fields to lat/lng coordinates
*   - Preserves original latitude/longitude columns if present
*   - Returns result_score for geocoding quality assessment
*   - Returns result_datasource for data source identification
*   - Provides quality analysis and filtering functions
*   - Provides data source analysis functions
*   
*   API documentation:
*   https://adresse.data.gouv.fr/api-doc/adresse
*   
* -------------------------------------------------- */

import axios from "axios";
import {DataFrame, merge} from "danfojs";
// import {useEffect, useState} from "react";

/*  Generic project libs:   */
import {formatDfColumnNames} from "./fieldsDetection";
import {loadDataframe} from "./generic";

// Configuration for smart geocoding
const SMART_GEOCODING_CONFIG = {
    maxAddresses: 10000,  
    featuresLimit: 5,     
    batchSize: 10,        
    maxConcurrentRequests: 2,
    weights: {
        postcodeMatch: 0.4,     
        cityCodeMatch: 0.4,    
        scoreApi: 0.2           
    },
    apiDelay: 400,       
    verboseLogs: false,  
    retryAttempts: 2,  
    retryDelay: 1000, 
    timeout: 30000,    
    useFallback: true,   
    preferBatchAPI: true,
  
    rateLimitBackoff: 2000, 
    maxRateLimitRetries: 1, 
    adaptiveDelay: true,    
    futureProofing: true    
};


const API_ENDPOINTS = {
    // IGN Géoportail - Modern persistent API (recommended 2025+)
    csvGeocoding: 'https://data.geopf.fr/geocodage/search/csv/',
    jsonGeocoding: 'https://data.geopf.fr/geocodage/search',
    // BAN historical - Legacy API end of life (temporary fallback until 2026)
    banFallback: 'https://api-adresse.data.gouv.fr/search/',
    banCsvFallback: 'https://api-adresse.data.gouv.fr/search/csv/',
};


/**
 * Function to fix French postal codes and INSEE codes by adding missing leading zeros
 * @param {string} code - Postal code or INSEE code to fix
 * @param {number} targetLength - Expected length (5 for postal codes and INSEE codes)
 * @returns {string} Code with leading zeros restored
 */
function fixFrenchCode(code, targetLength = 5) {
    if (!code || typeof code !== 'string') {
        return '';
    }
    
    const cleanCode = String(code).trim();
    if (cleanCode === '') {
        return '';
    }
    
    // Only add leading zeros for French codes (numeric codes shorter than expected length)
    if (/^\d+$/.test(cleanCode) && cleanCode.length < targetLength) {
        return cleanCode.padStart(targetLength, '0');
    }
    
    return cleanCode;
}

/**
 * Function to clean and optimize address queries before sending to API
 * Avoids 400 errors by filtering problematic elements
 * @param {string} address - Address to clean
 * @returns {string} - Cleaned and optimized address for API
 */
function cleanAddressForAPI(address) {
    if (!address || typeof address !== 'string') {
        return '';
    }
    
    let cleanedAddress = address.trim();
    
    // Step 1: Simplified cleaning (no encoding fixes)
    // cleanedAddress = fixAdvancedEncodingIssues(cleanedAddress); // Disabled encoding fixes
    
    // Step 2: Clean problematic characters that cause 400 errors
    // NEW: Remove apostrophes at beginning of string (causes errors like 'Aveze, 'Aumaillerie)
    cleanedAddress = cleanedAddress.replace(/^[\s']+/, '');
    
    // NEW: Remove problematic single and double quotes
    cleanedAddress = cleanedAddress.replace(/['"]/g, '');
    
    // Step 3: Remove common problematic elements
    const problematicPatterns = [
        // P.O. boxes and special codes
        /\bBP\s+\d+\b/gi,                      // BP 27, BP 82067, etc.
        /\bCS\s+\d+\b/gi,                      // CS (Courrier Service)
        /\bTSA\s+\d+\b/gi,                     // TSA (Tri Spécial Arrivée)
        
        // Roads and detailed road codes  
        /\bCD\s*\d+\b/gi,                      // CD304 (Chemin Départemental)
        /\bRN\s*\d+\b/gi,                      // RN (Route Nationale)
        /\bA\s*\d+\b/gi,                       // Highways (but careful with street numbers)
        
        // NEW: Simplified industrial and commercial zones (causes error Z.I. Sud Plastics Vallée)
        /\bZ\.I\.?\s+[\w\s-]*(?=\s+\d|\s*$)/gi,  // Z.I. or ZI with details (keep if followed by number)
        /\bZI\s+de\s+[\w\s-]+/gi,              // Detailed Industrial Zone
        /\bZAC\s+de\s+[\w\s-]+/gi,             // Zone d'Aménagement Concerté
        /\bZA\s+de\s+[\w\s-]+/gi,              // Zone d'Activité
        /\bZAE\s+de\s+[\w\s-]+/gi,             // Zone d'Activité Économique
        
        // NEW: Complex commercial names that disrupt geocoding
        /\b\w*\s*Plastics?\s+\w*/gi,          // Names with "Plastic" or "Plastics"
        /\bVallée?\s+[\w\s-]*(?=\s+\d)/gi,     // "Vallée" followed by details (except if followed by number)
        
        // Establishment and specific place mentions
        /\bUsine\s+du\s+[\w\s-]+/gi,           // Usine du Plan de Grasse
        /\bLID\s+de\s+[\w\s-]+/gi,             // Local d'Implantation Décentralisé
        /\bQuartier\s+[\w\s-]+(?=\s*[-,])/gi,  // Detailed neighborhood before dash/comma
        
        // Parasitic GPS coordinates and measurements
        /\b\d{3,4}\s*m\b/gi,                   // 2709 m, measurements in meters
        /\b\d+[.,]\d+°?\s*[NEWS]?\b/gi,        // Approximate coordinates
        
        // Cadastral and administrative references
        /\bSection\s+[A-Z]+\s+\d+/gi,          // Cadastral section
        /\bParcelle\s+\d+/gi,                  // Parcel
        /\bLot\s+\d+/gi,                       // Lot number
        
        // Corrupted URL encoding characters (%EF%BF%BD)
        /%EF%BF%BD/g,                          // Broken URL encoding characters
        /%[0-9A-F]{2}/g,                       // Other problematic URL encoded characters
    ];
    
    // Apply removals
    problematicPatterns.forEach(pattern => {
        cleanedAddress = cleanedAddress.replace(pattern, ' ');
    });
    
    // Step 3: Normalization of French ordinals
    const ordinalReplacements = [
        // Ordinals with corrupted encoding characters (before URL decoding)
        [/\d+(?:%EF%BF%BD|�|ï¿½)(?:me|er|re|e)\b/gi, (match) => {
            const num = match.match(/^\d+/)[0];
            return num === '1' ? `${num}er` : `${num}eme`;
        }],
        // Normal ordinals - normalize to avoid accent problems
        [/\b(\d+)(?:ème|eme)\b/gi, '$1eme'],   // Normalize "ème" to "eme"
        [/\b(\d+)(?:ère|ere)\b/gi, '$1ere'],   // Normalize "ère" to "ere"
        [/\b1er\b/gi, '1er'],                  // Keep 1er as is
    ];
    
    ordinalReplacements.forEach(([pattern, replacement]) => {
        if (typeof replacement === 'function') {
            cleanedAddress = cleanedAddress.replace(pattern, replacement);
        } else {
            cleanedAddress = cleanedAddress.replace(pattern, replacement);
        }
    });
    
    // Step 4: Cleaning excessive punctuation
    cleanedAddress = cleanedAddress
        .replace(/\s*[-,]\s*[-,]+\s*/g, ' ')   // Multiple dashes/commas
        .replace(/\s*[-,]\s*(?=\d{5}\s|$)/g, ' ') // Dash/comma before final postal code
        .replace(/\s*,\s*/g, ' ')              // Replace commas with spaces
        .replace(/\s+-\s+/g, ' ')              // Replace isolated dashes with spaces
        .replace(/^\s*[,-]\s*/, '')            // Remove dashes/commas at start
        .replace(/\s*[,-]\s*$/, '')            // Remove dashes/commas at end
        .replace(/\s+/g, ' ')                  // Multiple spaces
        .trim();
    
    // Step 5: Final length validation
    if (cleanedAddress.length < 3) {
        // If too short after cleaning, return simple trim
        const simpleClean = address.trim().replace(/\s+/g, ' ').trim();
        return simpleClean.length >= 3 ? simpleClean : address.trim();
    }
    
    // Step 6: Limit length to avoid too long requests
    if (cleanedAddress.length > 200) {
        // Keep first 200 characters stopping at a space
        const truncated = cleanedAddress.substring(0, 200);
        const lastSpace = truncated.lastIndexOf(' ');
        cleanedAddress = lastSpace > 100 ? truncated.substring(0, lastSpace) : truncated;
    }
    
    return cleanedAddress;
}

function csvToObj(csv) {
    if (!csv || csv.trim() === '') {
        throw new Error('Empty or invalid CSV data received from API');
    }

    const nb_comma = (csv.match(/,/g) || []).length;
    const nb_colon = (csv.match(/;/g) || []).length;
    const nb_tab = (csv.match(/\t/g) || []).length;
    
    let csvDel;
    if (nb_colon > 0 && (nb_colon >= nb_comma || nb_tab < nb_colon * 2)) {
        csvDel = ';';
    } else if (nb_comma > 0 && (nb_comma >= nb_colon || nb_tab < nb_comma * 2)) {
        csvDel = ',';
    } else if (nb_tab > nb_comma && nb_tab > nb_colon) {
        csvDel = '\t';
    } else {
        csvDel = ';';
    }

    const rows = csv.split("\n");
    if (rows.at(-1) === '') {
        rows.pop();
    }

    const columns = rows[0].replace('\r', '').split(csvDel);

    let csvObj = {};
    columns.forEach((col) => {
        csvObj[col] = [];
    });

    rows.slice(1).forEach((row) => {
        let record = row.replace('\r', '').split(csvDel);
        columns.forEach((col, ic) => {
            let value = record[ic] || '';
            
            // DISABLED: Apply encoding fixes to all values (désactivé temporairement)
            // value = fixEncodingIssues(value);
            
            // Apply French code formatting to postal code and INSEE code columns
            const isPostalCode = /postcode|code_postal|cp/i.test(col);
            const isINSEECode = /citycode|code_insee|insee/i.test(col);
            
            if (isPostalCode || isINSEECode) {
                value = fixFrenchCode(value, 5);
            }
            
            csvObj[col].push(value);
        });
    });
    return csvObj;

};

/**
 * Function to analyze if a file needs address enrichment
 * Returns true if addresses seem incomplete 
 */
async function needsAddressEnrichment(fileObj) {
    try {
        const text = await fileObj.text();
        if (!text || text.trim() === '') return false;
        
        // Detect delimiter - priority to classic delimiters
        const nbComma = (text.match(/,/g) || []).length;
        const nbSemicolon = (text.match(/;/g) || []).length;
        const nbTab = (text.match(/\t/g) || []).length;
        
        let delimiter;
        // Priority to classic delimiters
        if (nbSemicolon > 0 && (nbSemicolon >= nbComma || nbTab < nbSemicolon * 2)) {
            delimiter = ';';
        } else if (nbComma > 0 && (nbComma >= nbSemicolon || nbTab < nbComma * 2)) {
            delimiter = ',';
        } else if (nbTab > nbComma && nbTab > nbSemicolon) {
            delimiter = '\t';
        } else {
            delimiter = ';'; // Default
        }
        
        const lines = text.split('\n')
            .map(line => line.replace(/\r/g, ''))
            .filter(line => line.trim() !== '');
        
        if (lines.length < 2) return false;
        
        const headers = lines[0].split(delimiter);
        
        // Look for address, postal code, city columns
        const adressePatterns = ['adresse', 'address', 'voie', 'rue', 'route', 'chemin', 'avenue', 'boulevard'];
        const codePostalPatterns = ['code_postal', 'cp', 'postal', 'zip'];
        const communePatterns = ['commune', 'ville', 'city', 'localite'];
        
        const findColumn = (patterns) => {
            return headers.findIndex(header => {
                const headerLower = header.toLowerCase().trim();
                return patterns.some(pattern => headerLower.includes(pattern));
            });
        };
        
        const adresseColIndex = findColumn(adressePatterns);
        const codePostalColIndex = findColumn(codePostalPatterns);
        const communeColIndex = findColumn(communePatterns);
        
        // If no address column, no need for enrichment
        if (adresseColIndex === -1) return false;
        
        // If we have neither postal code nor separate city, address is probably already complete
        if (codePostalColIndex === -1 && communeColIndex === -1) {
            // console.log('Address seems complete (no separate postal code/city columns)');
            return false;
        }
        
        // If we have separate columns (address + postal_code + city), 
        // enrichment is ALWAYS beneficial as it gives more context to the API
        if (adresseColIndex >= 0 && (codePostalColIndex >= 0 || communeColIndex >= 0)) {
            // console.log('Separate address columns detected -> enrichment recommended');
            
            // Analyze a few lines to verify there's data to enrich
            let hasDataToEnrich = false;
            for (let i = 1; i < Math.min(lines.length, 6); i++) {
                const cols = lines[i].split(delimiter);
                if (cols.length > Math.max(adresseColIndex, codePostalColIndex, communeColIndex)) {
                    const adresse = cols[adresseColIndex]?.trim();
                    const codePostal = codePostalColIndex >= 0 ? cols[codePostalColIndex]?.trim() : '';
                    const commune = communeColIndex >= 0 ? cols[communeColIndex]?.trim() : '';
                    
                    // If there's an address AND (postal code OR city), we can enrich
                    if (adresse && adresse !== '' && (codePostal !== '' || commune !== '')) {
                        // console.log(`Example of possible enrichment: "${adresse}" + "${codePostal}" + "${commune}"`);
                        hasDataToEnrich = true;
                        break;
                    }
                }
            }
            
            return hasDataToEnrich;
        }
        
    } catch (error) {
        console.error('Error while analyzing file:', error);
        return false;
    }
}

/**
 * Function to create a complete address by concatenating address columns
 * LOGIC:
 * 1. Analyze the original CSV to detect delimiter and structure
 * 2. Identify address columns according to different patterns
 * 3. Create a new "adresse_complete" column without modifying existing structure
 * 4. Ensure each line has exactly the same number of columns
 */
async function createFullAddress(fileObj) {
    try {
        // console.log('=== START createFullAddress (fixed version) ===');
        const text = await fileObj.text();
        
        if (!text || text.trim() === '') {
            // console.log('Empty file, returning original file');
            return fileObj;
        }
        
        // 1. DELIMITER ANALYSIS - Improve detection for priority to ; and ,
        const nbComma = (text.match(/,/g) || []).length;
        const nbSemicolon = (text.match(/;/g) || []).length;
        const nbTab = (text.match(/\t/g) || []).length;
        
        let delimiter;
        // let delimiterName;
        
        // PRIORITY to classic delimiters (except if tabulations largely dominate)
        if (nbSemicolon > 0 && (nbSemicolon >= nbComma || nbTab < nbSemicolon * 2)) {
            delimiter = ';';
            // delimiterName = 'SEMICOLON';
            // console.log(`Delimiter detected: ";" (${nbSemicolon} occurrences)`);
        } else if (nbComma > 0 && (nbComma >= nbSemicolon || nbTab < nbComma * 2)) {
            delimiter = ',';
            // delimiterName = 'COMMA';
            // console.log(`Delimiter detected: "," (${nbComma} occurrences)`);
        } else if (nbTab > nbComma && nbTab > nbSemicolon) {
            delimiter = '\t';
            // delimiterName = 'TAB';
            // console.log(`Delimiter detected: TAB (${nbTab} occurrences)`);
        } else {
            // By default, use semicolon
            delimiter = ';';
            // delimiterName = 'SEMICOLON (default)';
            // console.log('Default delimiter: ";"');
        }
        
        // 2. STRUCTURE ANALYSIS
        const lines = text.split('\n')
            .map(line => line.replace(/\r/g, '')) // Remove \r
            .filter(line => line.trim() !== ''); // Remove empty lines
        
        if (lines.length < 2) {
            // console.log('Not enough lines (need headers + data), returning original file');
            return fileObj;
        }
        
        const headers = lines[0].split(delimiter);
        // console.log('Headers detected:', headers);
        // console.log('Number of columns:', headers.length);
        
        // 3. ADDRESS COLUMNS IDENTIFICATION
        // Flexible patterns to detect address columns
        const adressePatterns = ['adresse', 'address', 'voie', 'rue', 'route', 'chemin', 'avenue', 'boulevard'];
        const codePostalPatterns = ['code_postal', 'cp', 'postal', 'zip'];
        const communePatterns = ['commune', 'ville', 'city', 'localite'];
        
        const findColumn = (patterns) => {
            return headers.findIndex(header => {
                const headerLower = header.toLowerCase().trim();
                return patterns.some(pattern => headerLower.includes(pattern));
            });
        };
        
        const adresseColIndex = findColumn(adressePatterns);
        const codePostalColIndex = findColumn(codePostalPatterns);
        const communeColIndex = findColumn(communePatterns);
        
        // console.log('Identified columns:');
        // console.log('  - Address (index):', adresseColIndex, adresseColIndex >= 0 ? `"${headers[adresseColIndex]}"` : 'NOT FOUND');
        // console.log('  - Postal code (index):', codePostalColIndex, codePostalColIndex >= 0 ? `"${headers[codePostalColIndex]}"` : 'NOT FOUND');
        // console.log('  - City (index):', communeColIndex, communeColIndex >= 0 ? `"${headers[communeColIndex]}"` : 'NOT FOUND');
        
        // If no main address column is found, return original file
        if (adresseColIndex === -1) {
            // console.log('No main address column found, returning original file');
            return fileObj;
        }
        
        // 4. CREATING NEW CSV WITH COMPLETE ADDRESS
        // STRATEGY: Add a "adresse_complete" column rather than modifying existing one
        const newHeaders = [...headers, 'adresse_complete'];
        const newLines = [newHeaders.join(delimiter)];
        
        // Processing each data line
        // let lignesTraitees = 0;
        // let lignesIgnorees = 0;
        
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(delimiter);
            
            // STRICT CHECK OF NUMBER OF COLUMNS
            if (cols.length !== headers.length) {
                // console.warn(`Line ${i} ignored: ${cols.length} columns found, ${headers.length} expected`);
                // console.warn(`Content: "${lines[i]}"`);
                // lignesIgnorees++;
                continue;
            }
            
            // BUILDING COMPLETE ADDRESS with intelligent cleaning
            const addressParts = [];
            
            // Main address - CLEAN parasitic information AND fix encoding
            if (adresseColIndex >= 0) {
                let adresse = cols[adresseColIndex]?.trim();
                if (adresse && adresse !== '') {
                    const adresseOriginale = adresse;
                    
                    // 1. SIMPLIFIED CLEANING (no encoding fixes)
                    // adresse = fixAdvancedEncodingIssues(adresse); // Disabled encoding fixes
                    
                    // 2. Clean parasitic information that disrupts geocoding
                    adresse = adresse
                        .replace(/,\s*ZI\s+[^,]*(?:,|$)/gi, '') // Remove industrial zones
                        // .replace(/,\s*Zone\s+[^,]*(?:,|$)/gi, '') // Remove various zones
                        .replace(/\s*\([^)]*Parcelles?[^)]*\)/gi, '') // Remove parcel references
                        .replace(/\s*\([^)]*AM\s*\d+[^)]*\)/gi, '') // Remove cadastral references
                        .replace(/\s*\([^)]*ex\s*[^)]*\)/gi, '') // Remove "ex" references
                        .replace(/,+/g, ',') // Clean multiple commas
                        .replace(/,\s*$/, '') // Remove final comma
                        .trim();
                    
                    // Log for diagnosis (temporary)
                    if (adresse !== adresseOriginale && i <= 3) {
                        // console.log(`Address correction line ${i}:`);
                        // console.log(`  Before: "${adresseOriginale}"`);
                        // console.log(`  After: "${adresse}"`);
                    }
                    
                    if (adresse !== '') {
                        addressParts.push(adresse);
                    }
                }
            }
            
            // Postal code
            if (codePostalColIndex >= 0) {
                let codePostal = cols[codePostalColIndex]?.trim();
                if (codePostal && codePostal !== '') {
                    // codePostal = fixAdvancedEncodingIssues(codePostal); // Disabled encoding fixes
                    addressParts.push(codePostal);
                }
            }
            
            // City
            if (communeColIndex >= 0) {
                let commune = cols[communeColIndex]?.trim();
                if (commune && commune !== '') {
                    // commune = fixAdvancedEncodingIssues(commune); // Disabled encoding fixes
                    addressParts.push(commune);
                }
            }
            
            const adresseComplete = addressParts.length > 0 ? addressParts.join(' ') : '';
            
            // AGGRESSIVE DATA CLEANING to resolve InvalidQuotes + encoding correction
            const cleanedCols = cols.map(col => {
                if (typeof col === 'string') {
                    // Simplified cleaning without encoding fixes
                    return col
                        .replace(/[\r\n]/g, ' ')     // Remove carriage returns and newlines
                        .replace(/"/g, '')           // REMOVE all quotes (radical solution)
                        .replace(/'/g, '')           // Also remove apostrophes
                        .trim();                     // Remove spaces at start/end
                }
                return col || '';
            });
            
            // Add adresse_complete column (simplified cleaning)
            const cleanedAdresseComplete = adresseComplete
                .replace(/[\r\n]/g, ' ')
                .replace(/"/g, '')           // REMOVE all quotes
                .replace(/'/g, '')           // Also remove apostrophes
                .trim();
            
            cleanedCols.push(cleanedAdresseComplete);
            
            // Create line preserving original delimiter
            newLines.push(cleanedCols.join(delimiter));
            // lignesTraitees++;
        }
        
        // console.log(`Processing completed: ${lignesTraitees} lines processed, ${lignesIgnorees} lines ignored`);
        // console.log('Example of created complete address:', newLines[1]?.split(delimiter).slice(-1)[0]);
        
        // DEBUG: Check if there are still quotes in final content
        const finalContent = newLines.join('\n');
        const remainingQuotes = (finalContent.match(/"/g) || []).length;
        // console.log(`Remaining quotes in final file: ${remainingQuotes}`);
        
        if (remainingQuotes > 0) {
            // console.warn('WARNING: Quotes are still present in the file!');
            // Show some examples
            // const quotesLines = newLines.filter(line => line.includes('"')).slice(0, 3);
            // console.warn('Examples of lines with quotes:', quotesLines);
        }
        
        // 5. NEW FILE CREATION
        const newContent = newLines.join('\n');
        const blob = new Blob([newContent], { type: 'text/csv;charset=utf-8' });
        const newFile = new File([blob], fileObj.name, { type: fileObj.type });
        
        // console.log('=== END createFullAddress ===');
        // console.log(`New file created: ${newLines.length} total lines, ${newHeaders.length} columns`);
        // console.log(`Delimiter preserved: ${delimiterName}`);
        
        return newFile;
        
    } catch (error) {
        console.error('Error in createFullAddress:', error);
        console.error('Stack:', error.stack);
        console.log('Returning original file due to error');
        return fileObj;
    }
}

/**
 * Builds a complete address from different columns
 * @param {string} address - Main address
 * @param {string} postcode - Postal code
 * @param {string} cityName - City name
 * @returns {string} Formatted complete address
 */
function buildCompleteAddress(address, postcode = '', cityName = '') {
    const parts = [];
    
    // Clean main address with new cleaning function
    if (address && typeof address === 'string') {
        const cleanAddress = cleanAddressForAPI(address);
        if (cleanAddress && cleanAddress.length > 0) {
            parts.push(cleanAddress);
        }
    }
    
    // Add postal code if valid
    if (postcode && typeof postcode === 'string') {
        const cleanPostcode = String(postcode).trim();
        if (cleanPostcode && cleanPostcode.length >= 3) {
            parts.push(cleanPostcode);
        }
    }
    
    // Add city if valid (with light cleaning)
    if (cityName && typeof cityName === 'string') {
        const cleanCityName = cityName.trim(); // Simplified cleaning without encoding fixes
        if (cleanCityName && cleanCityName.length > 0) {
            parts.push(cleanCityName);
        }
    }
    
    return parts.join(' ');
}

/**
 * Selects the best feature among results using postal code and INSEE code
 * @param {Array} features - List of features returned by API
 * @param {string} searchPostcode - Searched postal code
 * @param {string} searchCityCode - Searched INSEE code
 * @returns {Object} Best selected feature
 */
function selectBestFeatureByPostcode(features, searchPostcode, searchCityCode = '') {
    if (!features || features.length === 0) return null;
    
    // If we only have one result, return it
    if (features.length === 1) return features[0];
    
    // Clean and validate searched postal code
    let cleanSearchPostcode = '';
    if (searchPostcode !== null && searchPostcode !== undefined) {
        cleanSearchPostcode = String(searchPostcode).trim().replace(/\s+/g, '');
    }
    
    // Clean and validate searched INSEE code
    let cleanSearchCityCode = '';
    if (searchCityCode !== null && searchCityCode !== undefined) {
        cleanSearchCityCode = String(searchCityCode).trim();
    }
    
    if (SMART_GEOCODING_CONFIG.verboseLogs) {
        // console.log(`  Selecting among ${features.length} results for PC: "${cleanSearchPostcode}", INSEE: "${cleanSearchCityCode}"`);
    }
    
    let bestFeature = features[0];
    let bestScore = 0;
    
    features.forEach((feature, index) => {
        const properties = feature.properties || {};
        const apiScore = properties.score || 0;
        let featurePostcode = properties.postcode || '';
        let featureCityCode = properties.citycode || '';
        
        // Ensure featurePostcode and featureCityCode are strings
        if (featurePostcode !== null && featurePostcode !== undefined) {
            featurePostcode = String(featurePostcode);
        }
        if (featureCityCode !== null && featureCityCode !== undefined) {
            featureCityCode = String(featureCityCode);
        }
        
        // Composite score based on postal code match, INSEE code and API score
        let compositeScore = 0;
        
        // 1. Postal code match
        let postcodeScore = 0;
        if (cleanSearchPostcode && featurePostcode) {
            const cleanFeaturePostcode = featurePostcode.trim().replace(/\s+/g, '');
            if (cleanFeaturePostcode === cleanSearchPostcode) {
                postcodeScore = 1.0;
            } else if (cleanSearchPostcode.length >= 3 && cleanFeaturePostcode.startsWith(cleanSearchPostcode.substring(0, 3))) {
                postcodeScore = 0.5; // Same department
            }
        }
        
        // 2. INSEE code match (more precise than postal code)
        let cityCodeScore = 0;
        if (cleanSearchCityCode && featureCityCode) {
            const cleanFeatureCityCode = featureCityCode.trim();
            if (cleanFeatureCityCode === cleanSearchCityCode) {
                cityCodeScore = 1.0; // Exact INSEE code match
            }
        }
        
        // 3. Composite score calculation with INSEE code priority
        compositeScore = (postcodeScore * SMART_GEOCODING_CONFIG.weights.postcodeMatch) + 
                        (cityCodeScore * SMART_GEOCODING_CONFIG.weights.cityCodeMatch) +
                        (apiScore * SMART_GEOCODING_CONFIG.weights.scoreApi);
        
        if (SMART_GEOCODING_CONFIG.verboseLogs) {
            // console.log(`    ${index + 1}. "${properties.label}" (PC: ${featurePostcode}, INSEE: ${featureCityCode}) - API Score: ${apiScore.toFixed(3)}, PC: ${postcodeScore.toFixed(1)}, INSEE: ${cityCodeScore.toFixed(1)}, Composite: ${compositeScore.toFixed(3)}`);
        }
        
        if (compositeScore > bestScore) {
            bestScore = compositeScore;
            bestFeature = feature;
        }
    });
    
    if (SMART_GEOCODING_CONFIG.verboseLogs) {
        // console.log(` Selected: "${bestFeature.properties.label}" (score: ${bestScore.toFixed(3)})`);
    }
    
    return bestFeature;
}

/**
 * Geocodes a single address with intelligent fallback to BAN
 * @param {string} address - Main address
 * @param {string} postcode - Postal code to improve selection
 * @param {string} cityCode - INSEE code to improve selection
 * @param {string} cityName - City name to build complete address
 * @returns {Object} Geocoding result
 */
async function geocodeSingleAddressWithFallback(address, postcode = '', cityCode = '', cityName = '') {
    try {
        const ignResult = await geocodeSingleAddress(address, postcode, cityCode, cityName);
        
        if (ignResult.result_status === 'ok' && ignResult.latitude && ignResult.longitude) {
            return ignResult;
        }
        
        if (SMART_GEOCODING_CONFIG.useFallback && 
            (ignResult.result_status === 'not found' || 
             ignResult.result_status === 'error' || 
             ignResult.result_status === 'timeout' ||
             ignResult.result_status === 'dns_error' ||
             ignResult.result_status === 'rate_limited')) {
            
            const banResult = await geocodeSingleAddressBAN(address, postcode, cityCode, cityName);
            if (banResult.result_status === 'ok') {
                return banResult;
            }
        }
        
        return ignResult;
        
    } catch (error) {
        if (SMART_GEOCODING_CONFIG.useFallback) {
            try {
                const banResult = await geocodeSingleAddressBAN(address, postcode, cityCode, cityName);
                return banResult;
            } catch (banError) {
                return {
                    latitude: null,
                    longitude: null,
                    result_score: 0,
                    result_type: '',
                    result_status: 'error',
                    _postcode: '',
                    _city: '',
                    _citycode: '',
                    _features_count: 0,
                    _search_query: buildCompleteAddress(address, postcode, cityName)
                };
            }
        }
        
        throw error;
    }
}

/**
 * Geocodes an address with BAN API (Base Adresse Nationale)
 */
async function geocodeSingleAddressBAN(address, postcode = '', cityCode = '', cityName = '') {
    if (!address || typeof address !== 'string') {
        return {
            latitude: null,
            longitude: null,
            result_score: 0,
            result_type: '',
            result_status: 'invalid address',
            _postcode: '',
            _city: '',
            _citycode: '',
            _features_count: 0,
            _search_query: ''
        };
    }
    
    const cleanAddress = address.trim();
    
    if (cleanAddress === '' || cleanAddress.length < 3) {
        return {
            latitude: null,
            longitude: null,
            result_score: 0,
            result_type: '',
            result_status: 'invalid address',
            _postcode: '',
            _city: '',
            _citycode: '',
            _features_count: 0,
            _search_query: cleanAddress
        };
    }
    
    const completeAddress = buildCompleteAddress(cleanAddress, postcode, cityName);
    
    // NEW: Address cleaning for BAN API (same logic as for IGN)
    let finalCleanedAddress = completeAddress;
    
    // Check encoding and clean
    if (completeAddress.includes('%')) {
        try {
            finalCleanedAddress = decodeURIComponent(completeAddress);
        } catch (e) {
            finalCleanedAddress = completeAddress;
        }
    }
    
    // Final cleaning of problematic characters
    finalCleanedAddress = finalCleanedAddress
        .replace(/^\s*['"\s]+/, '')        // Remove apostrophes/quotes at start
        .replace(/['"\s]+\s*$/, '')        // Remove apostrophes/quotes at end
        .replace(/\s{2,}/g, ' ')           // Multiple spaces → single space
        .trim();
    
    const params = new URLSearchParams({
        q: finalCleanedAddress,  // Use cleaned address
        limit: SMART_GEOCODING_CONFIG.featuresLimit.toString()
    });
    
    if (postcode && postcode.trim() !== '') {
        params.append('postcode', postcode.trim());
    }
    
    const url = `${API_ENDPOINTS.banFallback}?${params.toString()}`;
    
    try {
        const response = await axios.get(url, { 
            timeout: SMART_GEOCODING_CONFIG.timeout 
        });
        const data = response.data;
        
        if (data && data.features && data.features.length > 0) {
            let selectedFeature;
            
            if (data.features.length > 1 && (postcode || cityCode)) {
                selectedFeature = selectBestFeatureByPostcodeBAN(data.features, postcode, cityCode);
            } else {
                selectedFeature = data.features[0];
            }
            
            if (selectedFeature) {
                const props = selectedFeature.properties;
                const coords = selectedFeature.geometry.coordinates;
                
                return {
                    latitude: coords[1],
                    longitude: coords[0],
                    result_score: props.score || 0,
                    result_type: props.type || '',
                    result_status: 'ok',
                    _postcode: props.postcode || '', // Raw value without fixFrenchCode
                    _city: props.city || '', // No encoding fixes
                    _citycode: props.citycode || '', // Raw value without fixFrenchCode
                    _features_count: data.features.length,
                    _search_query: completeAddress
                };
            }
        }
        
        return {
            latitude: null,
            longitude: null,
            result_score: 0,
            result_type: '',
            result_status: 'not found',
            _postcode: '',
            _city: '',
            _citycode: '',
            _features_count: data.features ? data.features.length : 0,
            _search_query: completeAddress
        };
        
    } catch (error) {
        return {
            latitude: null,
            longitude: null,
            result_score: 0,
            result_type: '',
            result_status: 'error',
            _postcode: '',
            _city: '',
            _citycode: '',
            _features_count: 0,
            _search_query: completeAddress
        };
    }
}

/**
 * Intelligent selection for BAN API
 */
function selectBestFeatureByPostcodeBAN(features, searchPostcode, searchCityCode = '') {
    if (!features || features.length === 0) return null;
    if (features.length === 1) return features[0];
    
    let cleanSearchPostcode = '';
    if (searchPostcode !== null && searchPostcode !== undefined) {
        cleanSearchPostcode = String(searchPostcode).trim().replace(/\s+/g, '');
    }
    
    let bestFeature = features[0];
    let bestScore = 0;
    
    features.forEach((feature) => {
        const properties = feature.properties || {};
        const apiScore = properties.score || 0;
        let featurePostcode = properties.postcode || '';
        
        let compositeScore = apiScore;
        
        if (cleanSearchPostcode && featurePostcode) {
            const cleanFeaturePostcode = String(featurePostcode).trim().replace(/\s+/g, '');
            if (cleanFeaturePostcode === cleanSearchPostcode) {
                compositeScore += 0.3;
            }
        }
        
        if (compositeScore > bestScore) {
            bestScore = compositeScore;
            bestFeature = feature;
        }
    });
    
    return bestFeature;
}
async function geocodeSingleAddress(address, postcode = '', cityCode = '', cityName = '') {
    if (!address || typeof address !== 'string') {
        return {
            latitude: null,
            longitude: null,
            result_score: 0,
            result_type: '',
            result_status: 'invalid address',
            _postcode: '',
            _city: '',
            _citycode: '',
            _features_count: 0,
            _search_query: ''
        };
    }
    
    const cleanAddress = address.trim();
    
    if (cleanAddress === '' || cleanAddress.length < 3 || 
        /^[#\d\-\s]+$/.test(cleanAddress) || /^[^\w\s]/.test(cleanAddress)) {
        
        return {
            latitude: null,
            longitude: null,
            result_score: 0,
            result_type: '',
            result_status: 'invalid address',
            _postcode: '',
            _city: '',
            _citycode: '',
            _features_count: 0,
            _search_query: cleanAddress
        };
    }
    
    const completeAddress = buildCompleteAddress(cleanAddress, postcode, cityName);
    
    // NEW: Validation and cleaning before encoding to avoid 400 errors
    let finalCleanedAddress = completeAddress;
    
    // Check there's no URL encoding already in address
    if (completeAddress.includes('%')) {
        // console.warn(`Already encoded address detected: "${completeAddress}"`);
        // Decode first, then clean
        try {
            finalCleanedAddress = decodeURIComponent(completeAddress);
        } catch (e) {
            // console.warn('Decoding error, using original address');
            finalCleanedAddress = completeAddress;
        }
    }
    
    // NEW: Final cleaning before encoding to avoid problematic characters
    finalCleanedAddress = finalCleanedAddress
        .replace(/^\s*['"\s]+/, '')        // Remove apostrophes/quotes at start
        .replace(/['"\s]+\s*$/, '')        // Remove apostrophes/quotes at end
        .replace(/\s{2,}/g, ' ')           // Multiple spaces → single space
        .trim();
        
    const query = encodeURIComponent(finalCleanedAddress);
    const url = `${API_ENDPOINTS.jsonGeocoding}?q=${query}&limit=${SMART_GEOCODING_CONFIG.featuresLimit}`;
    
    let attempt = 0;
    const maxAttempts = SMART_GEOCODING_CONFIG.retryAttempts;
    
    while (attempt < maxAttempts) {
        try {
            const response = await axios.get(url, { timeout: SMART_GEOCODING_CONFIG.timeout });
            const data = response.data;
            
            if (data && data.features && data.features.length > 0) {
                let selectedFeature;
                
                if (data.features.length > 1 && (postcode || cityCode)) {
                    selectedFeature = selectBestFeatureByPostcode(data.features, postcode, cityCode);
                } else {
                    selectedFeature = data.features[0];
                }
                
                if (selectedFeature) {
                    const props = selectedFeature.properties;
                    const coords = selectedFeature.geometry.coordinates;
                    
                    return {
                        latitude: coords[1],
                        longitude: coords[0],
                        result_score: props.score || 0,
                        result_type: props.type || '',
                        result_status: 'ok',
                        _postcode: props.postcode || '', // Raw value without fixFrenchCode
                        _city: props.city || '', // No encoding fixes
                        _citycode: props.citycode || '', // Raw value without fixFrenchCode
                        _features_count: data.features.length,
                        _search_query: completeAddress
                    };
                }
            }
            
            return {
                latitude: null,
                longitude: null,
                result_score: 0,
                result_type: '',
                result_status: 'not found',
                _postcode: '',
                _city: '',
                _citycode: '',
                _features_count: data.features ? data.features.length : 0,
                _search_query: completeAddress
            };
            
        } catch (error) {
            attempt++;
            
            const isTimeout = error.code === 'ECONNABORTED' || 
                            error.message.includes('timeout') || 
                            (error.response && (error.response.status === 504 || error.response.status === 503));
            
            const isDNSError = error.code === 'ENOTFOUND' || 
                              error.message.includes('ERR_NAME_NOT_RESOLVED') ||
                              error.message.includes('getaddrinfo ENOTFOUND');
            
            const isRateLimited = error.response && error.response.status === 429;
            
            if (isDNSError) {
                return {
                    latitude: null,
                    longitude: null,
                    result_score: 0,
                    result_type: '',
                    result_status: 'dns_error',
                    _postcode: '',
                    _city: '',
                    _citycode: '',
                    _features_count: 0,
                    _search_query: completeAddress
                };
            }
            
            if (isRateLimited) {
                if (SMART_GEOCODING_CONFIG.verboseLogs) {
                    // console.warn(` Limite de taux atteinte pour "${completeAddress}" - Fallback vers BAN recommandé`);
                }
                return {
                    latitude: null,
                    longitude: null,
                    result_score: 0,
                    result_type: '',
                    result_status: 'rate_limited',
                    _postcode: '',
                    _city: '',
                    _citycode: '',
                    _features_count: 0,
                    _search_query: completeAddress
                };
            }
            
            if (isTimeout && attempt < maxAttempts) {
                const retryDelay = SMART_GEOCODING_CONFIG.retryDelay * attempt;
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                continue;
            }
            
            return {
                latitude: null,
                longitude: null,
                result_score: 0,
                result_type: '',
                result_status: isTimeout ? 'timeout' : 'error',
                _postcode: '',
                _city: '',
                _citycode: '',
                _features_count: 0,
                _search_query: completeAddress
            };
        }
    }
}



/**
 * Processes a batch of addresses in parallel with concurrency limitation
 * @param {Array} addressBatch - Batch of addresses to process
 * @param {number} batchIndex - Batch index for progress tracking
 * @param {number} totalBatches - Total number of batches
 * @returns {Array} Geocoding results for the batch
 */
async function processBatchParallel(addressBatch, batchIndex, totalBatches) {
    const results = [];
    let currentDelay = SMART_GEOCODING_CONFIG.apiDelay;
    // let rateLimitedCount = 0;
    
    // Helper function defined outside loop to avoid no-loop-func
    const processAddressInfo = async (addressInfo) => {
        const { address, postcode, cityCode, cityName, originalIndex } = addressInfo;
        
        if (!address || String(address).trim() === '') {
            return {
                originalIndex,
                result: {
                    latitude: null,
                    longitude: null,
                    result_score: 0,
                    result_type: '',
                    result_status: 'empty address',
                    _postcode: '',
                    _city: '',
                    _citycode: '',
                    _features_count: 0,
                    _search_query: ''
                }
            };
        }
        
        try {
            const result = await geocodeSingleAddressWithFallback(
                String(address), 
                postcode, 
                cityCode, 
                cityName
            );
            
            return { originalIndex, result };
            
        } catch (error) {
            return {
                originalIndex,
                result: {
                    latitude: null,
                    longitude: null,
                    result_score: 0,
                    result_type: '',
                    result_status: 'error',
                    _postcode: '',
                    _city: '',
                    _citycode: '',
                    _features_count: 0,
                    _search_query: buildCompleteAddress(String(address), postcode, cityName)
                }
            };
        }
    };
    
    for (let i = 0; i < addressBatch.length; i += SMART_GEOCODING_CONFIG.maxConcurrentRequests) {
        const batch = addressBatch.slice(i, i + SMART_GEOCODING_CONFIG.maxConcurrentRequests);
        
        // Utiliser directement la fonction helper sans référence à currentDelay
        const promises = batch.map(addressInfo => processAddressInfo(addressInfo));
        
        const groupResults = await Promise.all(promises);
        results.push(...groupResults);
        
        const rateLimitedInThisBatch = groupResults.filter(r => 
            r.result.result_status === 'rate_limited'
        ).length;
        
        // rateLimitedCount += rateLimitedInThisBatch;
        
        if (rateLimitedInThisBatch > 0 && SMART_GEOCODING_CONFIG.adaptiveDelay) {
            currentDelay = Math.min(currentDelay * 2, 2000);
            // console.log(`${rateLimitedInThisBatch} 429 errors detected - Delay increased to ${currentDelay}ms`);
        }
        
        if (i + SMART_GEOCODING_CONFIG.maxConcurrentRequests < addressBatch.length) {
            // Capture currentDelay value in a local variable
            const delayTime = currentDelay;
            await new Promise(resolve => setTimeout(resolve, delayTime));
        }
    }
    
    // const percentage = ((batchIndex + 1) / totalBatches * 100).toFixed(1);
    // const successCount = results.filter(r => r.result.result_status === 'ok').length;
    
    // let progressMsg = ` Batch ${batchIndex + 1}/${totalBatches} (${percentage}%) - ${results.length} addresses processed, ${successCount} found`;
    // if (rateLimitedCount > 0) {
    //     progressMsg += `, ${rateLimitedCount} rate limitations`;
    // }
    // console.log(progressMsg);
    
    return results;
}
/**
 * Processes a CSV file with optimized smart geocoding (parallel batch processing)
 * @param {File} fileObj - CSV file to process
 * @param {Object} options - Processing options
 * @returns {DataFrame} DataFrame with geocoding results
 */
async function processFileWithSmartGeocoding(fileObj, options) {

    // CRITICAL: Parse file manually to avoid type conversion like in csvToObj approach
    const fileContent = await fileObj.text();
    
    // Parse CSV manually without type inference (similar to csvToObj approach)
    const nb_comma = (fileContent.match(/,/g) || []).length;
    const nb_colon = (fileContent.match(/;/g) || []).length;
    const nb_tab = (fileContent.match(/\t/g) || []).length;
    
    let csvDel;
    if (nb_colon > 0 && (nb_colon >= nb_comma || nb_tab < nb_colon * 2)) {
        csvDel = ';';
    } else if (nb_comma > 0 && (nb_comma >= nb_colon || nb_tab < nb_comma * 2)) {
        csvDel = ',';
    } else if (nb_tab > nb_comma && nb_tab > nb_colon) {
        csvDel = '\t';
    } else {
        csvDel = ';';
    }

    const rows = fileContent.split("\n");
    if (rows.at(-1) === '') {
        rows.pop();
    }

    const columns = rows[0].replace('\r', '').split(csvDel);

    // Build data object preserving original format (like csvToObj)
    let csvObj = {};
    columns.forEach((col) => {
        csvObj[col] = [];
    });

    rows.slice(1).forEach((row) => {
        let record = row.replace('\r', '').split(csvDel);
        columns.forEach((col, ic) => {
            let value = record[ic] || '';
            // Keep values as strings without any transformation
            csvObj[col].push(value);
        });
    });

    // Create DataFrame from parsed data (this preserves string types)
    let df = new DataFrame(csvObj);
    df = formatDfColumnNames(df);
    
    // CRITICAL: Create a deep copy of original DataFrame to preserve exact original data
    let originalDf = df.copy();
    
    // Detect address, postal code, INSEE code and city columns
    const addressCol = df.columns.find(col => 
        col.toLowerCase().includes('adresse') || 
        col.toLowerCase().includes('address') ||
        col.toLowerCase().includes('adresse_complete')
    );
    
    const postcodeCol = df.columns.find(col => 
        col.toLowerCase().includes('code_postal') ||
        col.toLowerCase().includes('postal') ||
        col.toLowerCase().includes('cp')
    );
    
    const cityCodeCol = df.columns.find(col => 
        col.toLowerCase().includes('code_insee') ||
        col.toLowerCase().includes('insee') ||
        col.toLowerCase().includes('citycode') ||
        col.toLowerCase().includes('code_commune')
    );
    
    const cityNameCol = df.columns.find(col => 
        col.toLowerCase().includes('commune') ||
        col.toLowerCase().includes('ville') ||
        col.toLowerCase().includes('city') ||
        col.toLowerCase().includes('localite')
    );
    
    if (!addressCol) {
        throw new Error('No address column found for smart geocoding');
    }
    
    // console.log(`Colonnes détectées:`);
    // console.log(`   - Adresse: "${addressCol}"`);
    // console.log(`   - Code postal: "${postcodeCol || 'Non trouvé'}"`);
    // console.log(`   - Code INSEE: "${cityCodeCol || 'Non trouvé'}"`);
    // console.log(`   - Commune: "${cityNameCol || 'Non trouvé'}"`);
    
    // CRITICAL: Get values as strings to avoid type conversion
    const addresses = df[addressCol].values.map(val => val !== null && val !== undefined ? String(val) : '');
    const postcodes = postcodeCol ? df[postcodeCol].values.map(val => val !== null && val !== undefined ? String(val) : '') : [];
    const cityCodes = cityCodeCol ? df[cityCodeCol].values.map(val => val !== null && val !== undefined ? String(val) : '') : [];
    const cityNames = cityNameCol ? df[cityNameCol].values.map(val => val !== null && val !== undefined ? String(val) : '') : [];
    const totalRows = addresses.length;
    
    // Limitation to avoid overloading API (increased)
    const maxToProcess = Math.min(totalRows, SMART_GEOCODING_CONFIG.maxAddresses);
    if (totalRows > SMART_GEOCODING_CONFIG.maxAddresses) {
        // console.warn(`Limitation: processing first ${maxToProcess} addresses out of ${totalRows}`);
    } else {
        // console.log(`Processing ${maxToProcess} addresses with parallel geocoding`);
    }
    
    // Prepare data for batch processing (minimal transformation like in non-precision mode)
    const addressData = [];
    for (let i = 0; i < maxToProcess; i++) {
        let address = addresses[i] || '';
        let postcode = postcodes[i] || '';
        let cityCode = cityCodes[i] || '';
        let cityName = cityNames[i] || '';
        
        // Minimal cleaning similar to csvToObj approach
        address = String(address).trim();
        postcode = String(postcode).trim();
        cityCode = String(cityCode).trim();
        cityName = String(cityName).trim();
        
        // Apply French code formatting ONLY to postal code and INSEE code columns (like csvToObj)
        if (postcodeCol && /postcode|code_postal|cp/i.test(postcodeCol)) {
            postcode = fixFrenchCode(postcode, 5);
        }
        
        if (cityCodeCol && /citycode|code_insee|insee/i.test(cityCodeCol)) {
            cityCode = fixFrenchCode(cityCode, 5);
        }
        
        addressData.push({
            address,
            postcode,
            cityCode,
            cityName,
            originalIndex: i
        });
    }
    
    // Divide into batches for parallel processing
    const batches = [];
    for (let i = 0; i < addressData.length; i += SMART_GEOCODING_CONFIG.batchSize) {
        batches.push(addressData.slice(i, i + SMART_GEOCODING_CONFIG.batchSize));
    }
    
    // console.log(`Traitement par lots: ${batches.length} lots de ${SMART_GEOCODING_CONFIG.batchSize} adresses`);
    // console.log(`Concurrence: ${SMART_GEOCODING_CONFIG.maxConcurrentRequests} requêtes simultanées par lot`);
    
    // const startTime = Date.now();
    const allResults = [];
    
    // Process all batches sequentially (but with internal parallelism)
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchResults = await processBatchParallel(batch, batchIndex, batches.length);
        allResults.push(...batchResults);
    }
    
    // const endTime = Date.now();
    // const duration = ((endTime - startTime) / 1000).toFixed(1);
    
    // Organize results according to original order
    const results = new Array(maxToProcess);
    let foundCount = 0;
    
    allResults.forEach(({ originalIndex, result }) => {
        results[originalIndex] = result;
        if (result.result_status === 'ok') foundCount++;
    });
    
    for (let i = maxToProcess; i < totalRows; i++) {
        results.push({
            latitude: null,
            longitude: null,
            result_score: 0,
            result_type: '',
            result_status: 'not processed',
            _postcode: '',
            _city: '',
            _citycode: '',
            _features_count: 0,
            _search_query: ''
        });
    }
    
    const resultData = {
        latitude: results.map(r => r.latitude),
        longitude: results.map(r => r.longitude),
        result_score: results.map(r => r.result_score),
        result_type: results.map(r => r.result_type),
        result_status: results.map(r => r.result_status),
        search_query: results.map(r => r._search_query || ''),
        features_count: results.map(r => r._features_count || 0),
        // Add postal code and INSEE code columns using same logic as csvToObj
        _postcode: results.map(r => r._postcode || ''),
        _city: results.map(r => r._city || ''),
        _citycode: results.map(r => r._citycode || '')
    };
    
    let dfResults = new DataFrame(resultData);
    
    const extendedRename = options.colRename || API_RENAME;
    dfResults = dfResults.rename(extendedRename);
    dfResults = formatDfColumnNames(dfResults);
    
    // CRITICAL: Use original DataFrame for merge to preserve exact original data
    await originalDf.addColumn('idx_tmp', [...Array(originalDf.index.length).keys()], {inplace: true});
    await dfResults.addColumn('idx_tmp', [...Array(dfResults.index.length).keys()], {inplace: true});
    
    const mergedDf = await merge({'left': originalDf, 'right': dfResults, 'on': ['idx_tmp'], 'how': 'left'});
    await mergedDf.drop({columns: ['idx_tmp'], inplace: true});
    
    // const successRate = maxToProcess > 0 ? ((foundCount/maxToProcess)*100).toFixed(1) : '0.0';
    // const avgTimePerAddress = maxToProcess > 0 ? (parseFloat(duration) * 1000 / maxToProcess).toFixed(0) : '0';
    
    // console.log(`Geocoding COMPLETED:`);
    // console.log(`   Total time: ${duration}s (${avgTimePerAddress}ms/address)`);
    // console.log(`   Addresses processed: ${maxToProcess}/${totalRows}`);
    // console.log(`   Addresses found: ${foundCount} (${successRate}%)`);
    // console.log(`   Addresses not found: ${maxToProcess - foundCount}`);
    
    // if (parseFloat(duration) > 0) {
    //     const addressesPerSecond = (maxToProcess / parseFloat(duration)).toFixed(1);
    //     console.log(`   Débit moyen: ${addressesPerSecond} adresses/seconde`);
    // }
    
    return mergedDf;
}


/*  Columns to be returned by the BAN API:   */
const API_COL = ['latitude', 'longitude', 'result_score', 'result_type', 'result_status', 'search_query', 'features_count'];

const COL_PRESERVE = ['latitude', 'longitude'];

/*  Dictionnary of columns renaming after API output: (to avoid conflict with existing columns) */
const API_RENAME = {
    'latitude': 'lat_api_adresse',
    'longitude': 'lng_api_adresse',
    'result_score': 'score_fiabilite_api_coord',
    'result_type': 'niveau_geocodage',
    'result_status': 'status_resultat',
    'search_query': 'requete_recherche_complete',
    'features_count': 'nb_resultats_api',
    // CRITICAL: Add renaming for postal code and INSEE code columns
    '_postcode': 'code_postal_api',
    '_city': 'ville_api',
    '_citycode': 'code_insee_api'
};

/**
 * Function that takes a file object as an input (csv file with addresses headers) and returns a dataframe with the
 * lat lng extracted
 * Note: If 'latitude' and 'longitude' are columns from the file, the API drops them!!! This function preserves the
 * original columns and renames the API latitude and longitude columns.
 * 
 * Columns returned by the API:
 * - latitude/longitude: coordinates WGS84
 * - result_score: confidence score (0-1) where 1 = perfect match, <0.5 = low confidence
 * - result_type: type of geocoding result (address, locality, etc.)
 * - result_status: geocoding status (ok, not found, error, etc.)
 * - search_query: complete address query sent to the API
 * - features_count: number of results returned by the API
 * 
 * @param fileObj: obtained via an <input> button
 * @param options: headers making up the address
 * */
export const addressToLatLng = async (fileObj, options) => {

    const resultColumns = options.resultColumns? options.resultColumns: API_COL;
    const colRename = options.colRename? options.colRename: API_RENAME;
    const useSmartGeocoding = options.useSmartGeocoding? true: false;

    if (fileObj.size === 0) {
        throw new Error('File is empty');
    }
    
    if (!fileObj.name.toLowerCase().endsWith('.csv')) {
        console.warn('Warning: file does not seem to be a CSV');
    }

    if (useSmartGeocoding) {
        // console.log(' Smart geocoding mode enabled');
        return await processFileWithSmartGeocoding(fileObj, { ...options, colRename });
    }

    let processedFile = fileObj;
    let useFullAddress = false;
    
    if (options && options.createFullAddress) {
        const needsEnrichment = await needsAddressEnrichment(fileObj);
        
        if (needsEnrichment) {
            // console.log(" Address enrichment enabled (generic addresses detected)");
            processedFile = await createFullAddress(fileObj);
            useFullAddress = true;
        } else {
            // console.log(" Address enrichment disabled (addresses seem already complete)");
            useFullAddress = false;
        }
    }

    const formData = await new FormData();
    formData.append('data', processedFile);
    
    if (useFullAddress) {
        formData.append('columns', 'adresse_complete');
    }
    
    resultColumns.forEach(resCol => {
        formData.append('result_columns', resCol);
    });
    
    let csvData = null;

    await axios({
        method: 'POST',
        url: API_ENDPOINTS.csvGeocoding,
        headers: {'Content-Type': 'multipart/form-data'},
        data: formData,
        timeout: 300000,
    })
        .then((response) => {
            csvData = response.data;

        }).catch((error) => {
            console.error('Error during API call:', error);
            if (error.response) {
                console.log('Status:', error.response.status);
                console.log('Headers:', error.response.headers);
                console.log('Data:', error.response.data);
                
                if (error.response.status === 400) {
                    const errorMsg = error.response.data;
                    
                    if (errorMsg && typeof errorMsg === 'object' && errorMsg.message) {
                        if (errorMsg.message.includes('InvalidQuotes')) {
                            throw new Error(`CSV Error - Invalid quotes: File contains badly escaped quotes or problematic special characters.
                            Check that data doesn't contain unescaped quotes.
                            Details: ${errorMsg.message}`);
                        } else if (errorMsg.message.includes('TooManyFields')) {
                            throw new Error(`CSV Error - Too many columns: File contains lines with inconsistent number of columns.
                            Details: ${errorMsg.message}`);
                        } else {
                            throw new Error(`CSV format error: ${errorMsg.message}`);
                        }
                    }
                    else if (typeof errorMsg === 'string' && errorMsg.includes('TooManyFields')) {
                        throw new Error(`CSV format error: File contains lines with inconsistent number of columns. 
                        Check that each line has exactly the same number of columns as the header.
                        Details: ${errorMsg}`);
                    } else if (typeof errorMsg === 'string' && errorMsg.includes('CSV')) {
                        throw new Error(`CSV format error: ${errorMsg}. 
                        Check your file structure (delimiters, encoding, columns).`);
                    } else {
                        const errorDetails = typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg;
                        throw new Error(`Invalid data sent to API (error 400). 
                        Check your CSV file format. 
                        Details: ${errorDetails}`);
                    }
                } else if (error.response.status === 413) {
                    throw new Error('File too large (error 413). Maximum size is 50 MB.');
                } else if (error.response.status === 500) {
                    throw new Error('Internal API error (error 500). Please try again later.');
                }
            } else if (error.code === 'ECONNABORTED') {
                throw new Error('Timeout: API is taking too long to respond. Try with a smaller file.');
            } else if (error.code === 'NETWORK_ERROR') {
                throw new Error('Network error: Check your internet connection.');
            }
            throw new Error('Error during address API call: ' + error.message);
        })

    if (!csvData) {
        throw new Error('API did not return valid data');
    }

    let csvObj = await csvToObj(csvData);
    let dfTmp = new DataFrame(csvObj);

    dfTmp = dfTmp.rename(colRename);
    dfTmp = formatDfColumnNames(dfTmp);

    if (typeof window !== 'undefined' && window.__DEBUG_ANALYZE_NOT_FOUND__ && dfTmp.columns.includes('status_resultat')) {
        await analyzeNotFoundCases(dfTmp, processedFile, useFullAddress);
    }

    let dfBase = await loadDataframe(fileObj);
    dfBase = formatDfColumnNames(dfBase);
    let colBase = dfBase.columns;
    let colPreserve = [];
    COL_PRESERVE.forEach((col) => {
        if (colBase.includes(col)) {
            colPreserve.push(col);
        }
    });
        if (colPreserve.length > 0) {
            // console.log('merging with df base to preserve lat and long')
            await dfTmp.addColumn('idx_tmp', [...Array(dfTmp.index.length).keys()], {inplace: true});
            await dfBase.addColumn('idx_tmp', [...Array(dfTmp.index.length).keys()], {inplace: true});
            dfBase = dfBase.loc({columns: ['idx_tmp', ...colPreserve]});

            dfTmp = await merge({'left': dfTmp, 'right': dfBase, 'on': ['idx_tmp'], 'how': 'left'});

            await dfTmp.drop({columns: ['idx_tmp'], inplace: true});
        }
    return dfTmp;
}
const analyzeNotFoundCases = async (df, processedFile, useFullAddress) => {
    try {
        if (!df.columns.includes('status_resultat')) {
            console.log('Pas de colonne status_resultat pour l\'analyse');
            return;
        }

        // Trouver les cas "not-found"
        const statusValues = df['status_resultat'].values;
        const notFoundIndices = [];
        
        statusValues.forEach((status, index) => {
            if (status && status.toString().toLowerCase().includes('not') && status.toString().toLowerCase().includes('found')) {
                notFoundIndices.push(index);
            }
        });

        if (notFoundIndices.length === 0) {
            console.log('No "not-found" cases detected!');
            return;
        }

        // console.log(`\n ANALYSIS OF "NOT-FOUND" CASES (${notFoundIndices.length} total cases)`);
        // console.log('='.repeat(60));

        // Read processed file to retrieve used addresses
        const fileContent = await processedFile.text();
        const lines = fileContent.split('\n').filter(line => line.trim() !== '');
        
        // Detect delimiter
        const nbSemicolon = (fileContent.match(/;/g) || []).length;
        const nbComma = (fileContent.match(/,/g) || []).length;
        const nbTab = (fileContent.match(/\t/g) || []).length;
        
        let delimiter;
        if (nbSemicolon > 0 && (nbSemicolon >= nbComma || nbTab < nbSemicolon * 2)) {
            delimiter = ';';
        } else if (nbComma > 0 && (nbComma >= nbSemicolon || nbTab < nbSemicolon * 2)) {
            delimiter = ',';
        } else if (nbTab > nbComma && nbTab > nbSemicolon) {
            delimiter = '\t';
        } else {
            delimiter = ';';
        }

        const headers = lines[0].split(delimiter);
        
        // Find index of used address column
        let addressColumnIndex = -1;
        if (useFullAddress) {
            addressColumnIndex = headers.findIndex(h => h.toLowerCase().includes('adresse_complete'));
        } else {
            // Search for original address column
            addressColumnIndex = headers.findIndex(h => {
                const lower = h.toLowerCase();
                return lower.includes('adresse') || lower.includes('address') || 
                       lower.includes('voie') || lower.includes('rue');
            });
        }

        // console.log(`Address type used: ${useFullAddress ? 'COMPLETE_ADDRESS' : 'ORIGINAL_ADDRESS'}`);
        // console.log(`Address column: ${addressColumnIndex >= 0 ? headers[addressColumnIndex] : 'NOT FOUND'}`);
        // console.log('');

        // Display first 10 not-found cases
        const casesToShow = Math.min(10, notFoundIndices.length);
        
        for (let i = 0; i < casesToShow; i++) {
            const dfIndex = notFoundIndices[i];
            const fileLineIndex = dfIndex + 1; // +1 because line 0 is the header
            
            if (fileLineIndex < lines.length && addressColumnIndex >= 0) {
                const lineCols = lines[fileLineIndex].split(delimiter);
                let addressUsed = lineCols[addressColumnIndex] || 'EMPTY';
                
                // Apply simplified cleaning for display (no encoding fixes)
                const addressDisplayed = addressUsed; // No encoding fixes applied
                
                // Also retrieve other information from DataFrame if available
                const otherInfo = {};
                if (df.columns.includes('score_fiabilite_api_coord')) {
                    otherInfo.score = df['score_fiabilite_api_coord'].values[dfIndex];
                }
                
                console.log(`CASE ${i + 1}:`);
                console.log(`   Raw address: "${addressUsed}"`);
                if (addressDisplayed !== addressUsed) {
                    console.log(`   Corrected address: "${addressDisplayed}"`);
                }
                console.log(`   Status: ${statusValues[dfIndex]}`);
                if (otherInfo.score !== undefined) {
                    console.log(`   Score: ${otherInfo.score}`);
                }
                
                // Generate manual test link with corrected address
                const testUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(addressDisplayed)}`;
                console.log(`   Manual BAN test: ${testUrl}`);
                
                const testUrlIGN = `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(addressDisplayed)}`;
                console.log(`   Manual IGN test: ${testUrlIGN}`);
                console.log('');
            }
        }
        
        if (notFoundIndices.length > 10) {
            console.log(`... and ${notFoundIndices.length - 10} other "not-found" cases`);
        }
        
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('Error during not-found cases analysis:', error);
    }
};
