local generate
do
    local function create_state()
        return {
            result = ""
        }
    end
    local function append_preamble(state, config)
        state.result = config.preamble..state.result
        return state.result
    end
    local function append_newline(state, config)
        state.result ..= config.newline
        return state.result
    end
    local function append_indentation(state, config)
        state.result ..= config.indentation
        return state.result
    end
    local function append_ending_bracket(state, config)
        state.result ..= config.ending
        return state.result
    end
    local function make_comment_from_string(comment)
        return `/** {comment} */`
    end
    local function build_unexpected_type_string(target, what_type_is, expected_type)
        return `{target} is type '{what_type_is}'—expected type '{expected_type}'`
    end
    local function append_semicolon(state, config)
        state.result ..= ";"
        return state.result
    end
    local function build_key_value_pair_on_keyUnknown_and_type(is_read_only, keyUnknown, type_of)
        local neutralised_key = tostring(keyUnknown)
        return `{if is_read_only then "readonly " else ""}{neutralised_key}: {type_of}`
    end
    local function convert_lua_type_to_typescript_type(type_to_convert)
        if type_to_convert == "nil" then
            return "undefined"
        end
        return type_to_convert
    end
    -- example: READ-ONLY string
    local function return_type_and_is_readonly_in_unfiltered_type(type_of_unfiltered)
        local read_only_start_index_or_is_read_only, read_only_end_index = string.find(type_of_unfiltered, "READ-ONLY ", 1, true)
        if not read_only_start_index_or_is_read_only then
            return false, type_of_unfiltered
        end
        local filtered_type = string.sub(type_of_unfiltered, read_only_end_index + 1)
        return true, filtered_type
    end
    local function parse_and_extract_type_and_read_only_status_of_sharedvars_description(sharedvars_description_of_this_sharedvar_unfiltered)
        local first_closing_parenthesis_start_index, first_closing_parenthesis_end_index = string.find(sharedvars_description_of_this_sharedvar_unfiltered, ") ", 2, true)
        -- we know the first opening parenthesis is always at position 1
        local is_read_only, type_of = return_type_and_is_readonly_in_unfiltered_type(string.sub(sharedvars_description_of_this_sharedvar_unfiltered, 2, first_closing_parenthesis_start_index - 1))
        local description = string.sub(sharedvars_description_of_this_sharedvar_unfiltered, first_closing_parenthesis_end_index + 1)
        
        return is_read_only, type_of, description
    end
    local function validate_config(sharedvars_description, config)
        if type(config.preamble) ~= "string" then
            return false, build_unexpected_type_string('config.preamble', type(config.preamble), 'string')
        end
        if type(sharedvars_description) ~= "table" then
            return false, build_unexpected_type_string('sharedvars_description', type(sharedvars_description), 'table')
        end
        if type(config.newline) ~= "string" then
            return false, build_unexpected_type_string("config.newline", type(config.newline), 'string')
        end
        if type(config.indentation) ~= "string" then
            return false, build_unexpected_type_string("config.indentation", type(config.indentation), 'string')
        end
        if type(config.ending) ~= "string" then
            return false, build_unexpected_type_string("config.ending", type(config.ending), 'string')
        end
        return true
    end
    -- declare const sharedvars: {
    -- end character in config
    -- option to not add newlines
    generate = function(sharedvars_description, config)
        local sharedvars_description = sharedvars_description or {}
        local config = config or {}
        local validated, error_or_nil = validate_config(sharedvars_description, config)
        if not validated then
            return error("Invalid config: "..error_or_nil)
        end
        local state = create_state()
        append_preamble(state, config)
        for keyUnknown, valueUnknown in pairs(sharedvars_description) do
            local sharedvars_description_of_this_sharedvar_unfiltered = valueUnknown
            local is_read_only, type_of, description = parse_and_extract_type_and_read_only_status_of_sharedvars_description(sharedvars_description_of_this_sharedvar_unfiltered)
            append_newline(state, config) append_indentation(state, config) state.result ..= make_comment_from_string(description)
            append_newline(state, config)
            append_indentation(state, config)
            state.result ..= build_key_value_pair_on_keyUnknown_and_type(is_read_only, keyUnknown, convert_lua_type_to_typescript_type(type_of))
            append_semicolon(state, config)
        end
        append_newline(state, config)
        append_ending_bracket(state, config)
        return state
    end
end

print(generate(sharedvars_descriptions, {
    preamble = "/* Autogenerated sharedvars for DEADLINE version="..sharedvars.game_version.." branch="..sharedvars.game_branch.." */\nexport type sharedvars_generated = {",
    indentation = " ",
    newline = "\n",
    ending = "}"
}).result)