# Character Generator Specification

## Overview

Implement a `/character` slash command that generates RPG characters using the currently loaded RPG rulebook (via `/rag_source`). The implementation must use an agentic loop approach to ensure accurate character creation according to the specific game system's rules.

## Core Requirements

### 1. Agentic Loop Architecture

The character generator should implement a multi-step agent that:

1. **Phase 1: Research**
   - Look up the official character creation process for the loaded RPG system
   - Find examples of properly formatted characters for that system
   - Identify required fields, attributes, and structural elements

2. **Phase 2: Initial Draft**
   - Create a skeleton character with obvious placeholder values
   - Use clear markers like `[PLACEHOLDER: name]`, `[MISSING: dice_roll]`
   - Include all sections identified in Phase 1

3. **Phase 3: Iterative Refinement**
   - For each placeholder, query the RPG rulebook for specific guidance
   - Replace placeholders with system-appropriate values using the dice tool if needed when a dice value or a randomized choice is called for
   - When filling out names, biographical backstory and similar creative details, creativity is encouraged, but should use the world, characters, and setting information in the RPG gamebook for inspiration.
   - Validate against the rulebook's examples and requirements
   - Repeat until all placeholders are filled or confirmed unnecessary

4. **Phase 4: Final Validation**
   - Cross-check against the rulebook's example character format
   - Ensure consistency across all sections. Backstory and other creative character sections should be rewritten if needed to match what is reasonable given the statistics, skills, etc.

### 2. Critical Constraints

#### A. No Training Data Leakage - CRITICAL WARNING

**ABSOLUTELY NEVER use any pre-existing game system knowledge for character generation. This includes but is not limited to:**

- **Dungeons & Dragons (all editions)** - including D&D 5e, 3.5e, Pathfinder-based mechanics
- **Pathfinder (all editions)** - including Pathfinder 1e and 2e
- **All d20 system games** - any game using the d20 System Reference Document (SRD)
- **Any other popular RPG systems** - including but not limited to: Warhammer Fantasy, Shadowrun, Call of Cthulhu, GURPS, Fate, etc.

**The LLM must ONLY use information explicitly provided in the loaded RPG rulebook.**

Implement this by:

1. Including explicit warnings in EVERY prompt:
   ```
   ⚠️ CRITICAL WARNING: You MUST NOT use any knowledge from other game systems including D&D, Pathfinder, or any d20-based system. ONLY use the provided RPG rulebook content for ALL character generation decisions.
   ```

2. Adding verification steps that check for:
   - D20-style terminology (hit points, armor class, saving throws, proficiency bonus, etc.)
   - D&D/Pathfinder specific mechanics (ability scores like Strength/Dexterity, skill checks with DCs)
   - Common tropes from popular systems (class levels, spell slots, feats, etc.)

3. Using system prompts that emphasize adherence to the specific rulebook's unique mechanics

#### B. No System References in Examples - STRICT REQUIREMENT

**NEVER mention "Dungeons & Dragons", "Pathfinder", or any d20-based system in ANY prompt, example output, or documentation.**

This includes:
- Never using D&D-style ability scores (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma)
- Never referencing common RPG mechanics unless explicitly defined in the rulebook
- Never using terminology like "hit points", "armor class", "saving throws", "proficiency bonus"
- Never assuming standard character creation steps that aren't in the rulebook

Instead:
- Use generic terms like "the RPG system", "this game", or "the rulebook"
- Refer to character elements as they appear in the rulebook (which may be completely different from standard RPGs)
- If examples are needed, create completely fictional systems with made-up mechanics that have no relation to any real-world RPG

**Remember**: The goal is to generate characters for ANY RPG system, not just D&D. Each system has its own unique rules and character structure. Your job is to follow the rulebook exactly as written.

### 3. Integration Points

#### A. RAG Source Dependency

The command requires a valid RPG rulebook to be loaded via `/rag_source`. Behavior when no source is loaded:

```
If /rag_source has not been executed:
  - Reply: "No RPG rulebook has been loaded yet. Use /rag_source to load a rulebook first."
  - Exit without processing
```

#### B. Output Format

The final character should be formatted in markdown and made into a Discord message using our pagination system. Do NOT use any D20-style terminology like "hit points", "armor class", "saving throws", or similar mechanics unless explicitly defined in the rulebook.

### 4. Implementation Guidelines

#### A. Prompt Engineering Template

Each agent step should use prompts structured like:

```markdown
You are an expert RPG character creation assistant.

⚠️ CRITICAL WARNING: You MUST NOT use any knowledge from other game systems including D&D, Pathfinder, or any d20-based system. ONLY use the provided RPG rulebook content for ALL character generation decisions.

<RULEBOOK>
{rulebook_content}
</RULEBOOK>

Your task: {specific_task}

Follow these instructions exactly:
1. {instruction_1}
2. {instruction_2}
3. {verification_step}

Output format: {expected_format}
```

#### B. Placeholder Strategy

Use distinguishable placeholder patterns:

- `[PLACEHOLDER: description]` - For text that needs research
- `[MISSING: field_name]` - For fields with missing values
- `[UNKNOWN: aspect]` - For aspects requiring rulebook lookup

This makes it easy to track which elements have been resolved.

#### C. Loop Termination Conditions

The agentic loop should terminate when:

1. All placeholders are filled
2. Maximum iterations reached (e.g., 20 cycles)
3. Rulebook content is exhausted for a specific query
4. User cancels the operation

### 5. Error Handling

| Scenario | Response |
|----------|----------|
| No rulebook loaded | "No RPG rulebook has been loaded yet. Use /rag_source to load a rulebook first." |
| Rulebook too short | "The loaded rulebook doesn't contain sufficient information for character creation. Please try another source." |
| Ambiguous rules | "I found multiple interpretations in the rulebook. Could you clarify which approach to use?" |
| Generation timeout | "Character generation is taking longer than expected. The system may be complex or the rulebook extensive." |

### 6. Testing Strategy

Create test cases that verify:

1. **System Isolation**: Generate characters for different fictional RPG systems and confirm no D&D/Pathfinder elements leak between them
2. **Placeholder Resolution**: Verify all placeholders are replaced with rulebook-appropriate values
3. **Format Compliance**: Ensure output matches the expected markdown structure
4. **Error Cases**: Test behavior when no source is loaded or rulebook content is insufficient

## Example Flow (Generic Example)

```
User: /character

Agent Step 1:
- Query: "What are the steps for character creation in this RPG system?"
- Result: Character creation follows these steps: [steps from rulebook]

Agent Step 2:
- Create skeleton with placeholders
- [PLACEHOLDER: core_element_1], [PLACEHOLDER: core_element_2], etc.

Agent Step 3:
- Query: "What are example values for [element] in this system?"
- Replace placeholders with system-appropriate values from rulebook
- Continue until all placeholders resolved...

Final Output:
# Character Name

## Core Information
- **Name**: [Character's name]
- **Core Element 1**: [Value from rulebook]
- **Core Element 2**: [Value from rulebook]

## Attributes
| Attribute | Value |
|-----------|-------|
| [Attribute 1] | [Score] |
| [Attribute 2] | [Score] |

## Skills & Proficiencies
- [Skill/Proficiency 1]
- [Skill/Proficiency 2]

## Features & Abilities
- [Feature/Ability 1]
- [Feature/Ability 2]

## Equipment
- [Equipment item 1]
- [Equipment item 2]

## Notes
[Any additional information from the rulebook]
```

## Success Criteria

A character generator implementation is complete when:

1. ✅ `/character` command works with loaded RPG rulebook
2. ✅ Agentic loop properly researches, drafts, and refines
3. ✅ No D&D/Pathfinder/d20 elements appear in output or prompts
4. ✅ All placeholders are resolved using rulebook content
5. ✅ Output follows the specified markdown format
6. ✅ Error handling works for edge cases
