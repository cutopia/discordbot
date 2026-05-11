# Character Validation Retry Logic

## Overview

This document describes the implementation of retry logic for character validation in the `/character` command. When validation fails, the agent now retries up to 3 times by re-executing all character creation steps and revalidating.

## Changes Made

### 1. Added `maxValidationRetries` Property

**Location:** `CharacterGenerationAgent.constructor()`

```javascript
this.maxValidationRetries = 3; // Maximum revalidation attempts
```

This property controls the maximum number of validation retry attempts allowed.

### 2. Modified `validateCharacterSheet()` Method

**Location:** Lines 892-1000+

The method now:
- Accepts a `retryCount` parameter (default: 0)
- Returns different result structures based on validation outcome
- Includes `shouldRetry` flag when validation fails
- Handles both validation failures and errors with retry logic

**Key Changes:**
```javascript
async validateCharacterSheet(retryCount = 0) {
  // ... validation logic ...
  
  if (response.includes('Validation Result: PASS')) {
    return { 
      success: true, 
      message: 'Character sheet validated successfully',
      retryCount: retryCount
    };
  } else {
    // Validation failed - check if we can retry
    if (retryCount < this.maxValidationRetries) {
      return { 
        success: false, 
        message: `Character sheet validation failed`,
        warnings: [response],
        shouldRetry: true,
        retryCount: retryCount
      };
    } else {
      // Max retries exceeded - return with warnings but mark as complete
      return { 
        success: true, 
        message: `Character sheet created with validation warnings after ${this.maxValidationRetries} retry attempts`,
        warnings: [response],
        shouldRetry: false,
        retryCount: retryCount
      };
    }
  }
}
```

### 3. Added `reexecuteStep()` Method

**Location:** Lines 1002-1156

This new method re-executes a specific character creation step to address validation issues:

```javascript
async reexecuteStep(stepIndex) {
  // Re-execute the step with updated context
  // Update character sheet with results
  // Record choice for consistency checking
}
```

### 4. Added `validateCharacterSheetWithRetry()` Method

**Location:** Lines 1158-1203

This method implements the retry loop logic:

```javascript
async validateCharacterSheetWithRetry() {
  let validationResult;
  let attempt = 0;
  
  // First validation attempt
  validationResult = await this.validateCharacterSheet(attempt);
  
  // If validation fails and we can retry, re-execute steps and revalidate
  while (
    !validationResult.success || 
    (validationResult.shouldRetry && attempt < this.maxValidationRetries)
  ) {
    if (!validationResult.success || validationResult.shouldRetry) {
      attempt++;
      
      // Re-execute all steps to address validation issues
      for (let i = 0; i < this.steps.length; i++) {
        await this.reexecuteStep(i);
        
        // Update character sheet with results from this step
        if (this.progressUpdates[this.progressUpdates.length - 1] && 
            this.progressUpdates[this.progressUpdates.length - 1].result && 
            this.progressUpdates[this.progressUpdates.length - 1].result.characterSheetUpdates) {
          Object.assign(this.characterSheet, this.progressUpdates[this.progressUpdates.length - 1].result.characterSheetUpdates);
        }
      }
      
      // Revalidate
      validationResult = await this.validateCharacterSheet(attempt);
    }
    
    if (attempt >= this.maxValidationRetries) {
      break;
    }
  }
  
  return validationResult;
}
```

### 5. Modified `generateCharacter()` Method

**Location:** Lines 1287-1340

The method now uses the new validation with retry logic:

```javascript
async generateCharacter() {
  // ... step execution code ...
  
  // Step 3: Validate the final character sheet with retry logic
  console.log("Starting validation with retry logic");
  const validation = await this.validateCharacterSheetWithRetry();
  
  console.log(`Character generation completed with ${validation.retryCount + 1} validation attempt(s)`);
  
  return {
    success: true,
    formattedSheet: this.formatCharacterSheet(validation),
    progressUpdates: this.progressUpdates,
    characterSheet: this.characterSheet,
    validation: validation
  };
}
```

## How It Works

### Flow Diagram

```
┌─────────────────────────────┐
│ Generate Character          │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ Execute All Steps           │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ Validate Character Sheet    │
│ (Attempt 1)                 │
└──────────┬──────────────────┘
           │
           ├─ PASS ──────────────► Return Success
           │
           ▼ FAIL
┌─────────────────────────────┐
│ Retry? (attempt < 3)        │
└──────────┬──────────────────┘
           │
           ├─ NO ───────────────► Return with Warnings
           │
           ▼ YES
┌─────────────────────────────┐
│ Re-execute All Steps        │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ Validate Character Sheet    │
│ (Attempt 2)                 │
└──────────┬──────────────────┘
           │
           ├─ PASS ──────────────► Return Success
           │
           ▼ FAIL
┌─────────────────────────────┐
│ Retry? (attempt < 3)        │
└──────────┬──────────────────┘
           │
           ├─ NO ───────────────► Return with Warnings
           │
           ▼ YES
┌─────────────────────────────┐
│ Re-execute All Steps        │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ Validate Character Sheet    │
│ (Attempt 3)                 │
└──────────┬──────────────────┘
           │
           ├─ PASS ──────────────► Return Success
           │
           ▼ FAIL
┌─────────────────────────────┐
│ Max Retries Exceeded        │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ Return with Warnings        │
└─────────────────────────────┘
```

### Retry Logic Details

1. **First Validation Attempt:**
   - Character sheet is validated after all steps are complete
   - If validation passes, the process completes successfully
   - If validation fails and `retryCount < maxValidationRetries`, proceed to retry

2. **Retry Process:**
   - All character creation steps are re-executed in sequence
   - Each step's results update the character sheet
   - The character sheet is revalidated
   - This continues until either:
     - Validation passes, or
     - `retryCount` reaches `maxValidationRetries`

3. **Final State:**
   - If validation eventually passes, return success
   - If max retries exceeded, return with warnings but mark as complete

## Testing

A test file has been created at `tests/test-character-validation-retry.js` that verifies:

1. ✅ `maxValidationRetries` property is set to 3
2. ✅ `validateCharacterSheet()` method exists and accepts retryCount parameter
3. ✅ `validateCharacterSheetWithRetry()` method exists
4. ✅ `reexecuteStep()` method exists
5. ✅ `generateCharacter()` uses the new validation logic
6. ✅ Validation results have correct structure
7. ✅ Retry count parameter is properly handled
8. ✅ `shouldRetry` flag is present in validation results
9. ✅ Character sheet is updated during retries
10. ✅ Validation retry loop logic is correct

Run tests with:
```bash
node tests/test-character-validation-retry.js
```

## Benefits

1. **Improved Reliability:** Failed validations are automatically retried without user intervention
2. **Better User Experience:** Users get a complete character even if initial validation fails
3. **Transparency:** All retry attempts are logged with detailed messages
4. **Configurable:** The maximum number of retries can be adjusted by changing `maxValidationRetries`

## Configuration

To change the maximum number of validation retries, modify the constructor:

```javascript
this.maxValidationRetries = 5; // Change to 5 retries
```

## Notes

- The retry logic only applies to validation failures, not step execution failures (which have their own retry mechanism)
- Each retry re-executes ALL character creation steps, ensuring consistency
- The final character sheet includes all updates from both initial and retry attempts
- Validation warnings are included in the output even when max retries are exceeded
