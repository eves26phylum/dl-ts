/// <reference types="@rbxts/types" />
/// <reference types="@rbxts/compiler-types" />
// Note: this is unfinished because i haven't taken the time to make every single thing work. This will be improved on when I find bugs because the LLM cannot access the full context of the game's environment because I didn't give it the stuff in _G

type CamelToSnake<S extends string> = S extends `${infer T}${infer U}`
    ? `${T extends Capitalize<T> ? "_" : ""}${Lowercase<T>}${CamelToSnake<U>}`
    : S;
type SnakifyString<S extends string> = CamelToSnake<S> extends `_${infer T}` ? T : CamelToSnake<S>;

type SnakifyKeys<T> = {
    [K in keyof T]: T[K];
};

type SnakeRaycastParams = SnakifyKeys<RaycastParams>;
type SnakeRaycastResult = SnakifyKeys<RaycastResult>;

/**
 * Filters out any property whose VALUE type is `symbol` (including `unique symbol`).
 *
 * @rbxts/types uses nominal brand properties of the form
 * `readonly _nominal_Instance: unique symbol` on every class in the Roblox
 * hierarchy. roblox-ts inspects these brands to decide whether to emit
 * `self:method()` (Roblox instance) or `self.method()` (plain object).
 *
 * By stripping all symbol-valued properties before intersecting with
 * InstanceProperties<T>, WrappedInstance becomes a plain anonymous object type
 * that roblox-ts cannot identify as a Roblox class, so dot-call emission
 * applies to every callable member — for any T, including the default T=Instance.
 */
type StripRobloxBrands<T> = { [K in keyof T as T[K] extends symbol ? never : K]: T[K] }

// ================================================================
// Deadline Modding – TypeScript Ambient Declarations
// Source: https://recoil-group.github.io/deadline-modding/making-mods/scripting/api/
//
// Drop this file anywhere in your project and add it to your
// tsconfig.json "include" array for full autocomplete coverage.
//
// Roblox engine primitives (Vector3, CFrame, Color3…) are declared
// below as minimal stubs. If you're using roblox-ts, delete the
// entire "ROBLOX ENGINE PRIMITIVES" section and import from
// @rbxts/types instead.
//
// Availability tags used throughout:
//   [SHARED]  – available in both server and client scripts
//   [SERVER]  – server scripts only
//   [CLIENT]  – client scripts only
// ================================================================


// ================================================================
// ROBLOX ENGINE PRIMITIVES
// ================================================================

// ================================================================
// CORE INFRASTRUCTURE
// ================================================================



// ================================================================
// GAME CLASSES  [SHARED]
// ================================================================

interface TimerInstance {
    /** Returns true once the configured interval has elapsed since the last reset(). */
    // docs: timer:expired() — colon, keep as method
    expired(): boolean;
    /** Restarts the countdown from zero. */
    // docs: timer:reset() — colon, keep as method
    reset(): void;
}

/**
 * Fires an expiry flag once per configured interval.
 * Intended for use inside time.renderstep callbacks.
 * @example
 * const t = Timer.new(5);
 * time.renderstep("my_label", (dt) => {
 *   if (t.expired()) { t.reset(); print("5s passed"); }
 * });
 */
declare const Timer: {
    new(interval: number): TimerInstance;
};

interface SpringInstance {
    /** Applies an instantaneous velocity impulse to the spring. */
    // docs: spring:shove() — colon, keep as method
    shove(vector: Vector3): void;
    /** Advances the spring simulation by deltaTime seconds. */
    // docs: spring:update() — colon, keep as method
    update(deltaTime: number): void;
}

/**
 * Critically-damped spring, useful for smooth value / camera interpolation.
 * @param mass    Default 1
 * @param force   Default 50
 * @param damping Default 4
 * @param speed   Default 4
 */
declare const Spring: {
    new(mass?: number, force?: number, damping?: number, speed?: number): SpringInstance;
};

interface SignalInstance<T extends (...args: any[]) => void = (...args: any[]) => void> extends RBXScriptSignal {
    // docs: signal:Fire() — colon, keep as method
    Fire(...args: Parameters<T>): void;
}

/** Creates a new manually-controlled Signal. */
declare const Signal: {
    new<T extends (...args: any[]) => void = (...args: any[]) => void>(): SignalInstance<T>;
};

type ExcludeInstanceKeys<T> = Pick<T, Exclude<keyof T, keyof Instance>>

// ================================================================
// INSTANCE SYSTEM  [SHARED]
// ================================================================

/**
 * A sandboxed proxy wrapping a Roblox engine instance.
 *
 * All callable members use dot notation in the Deadline modding API
 * (e.g. `instance.play()`, `instance.get_tags()`), so every method
 * is declared as a property function so roblox-ts emits `self.method()`
 * rather than `self:method()`.
 *
 * The intersection with StripRobloxBrands<InstanceProperties<T>> provides
 * full property autocomplete and type safety for direct property assignments
 * (e.g. `instance.Size = new Vector3(...)`) while stripping the @rbxts/types
 * nominal brand properties (readonly _nominal_*: unique symbol) that would
 * otherwise cause roblox-ts to identify this type as a Roblox Instance and
 * force colon-call emission.
 *
 * Properties may be **set** freely (e.g. `instance.Volume = 0.5`,
 * `instance.Parent = get_map_root()`). Reading back Roblox-native
 * properties like `.Parent` is **not** supported by the proxy — only
 * the explicitly typed members below return meaningful values.
 */
type WrappedInstance<T extends Instance = Instance> = {
    /** Set the Roblox Parent. Reading it back is not supported. */
    Parent: WrappedInstance<Instance>;
    /** Set the Roblox Name. Reading it back is not supported. */
    Name: string;

    // ── Sound (valid on Sound instances only) ────────────────────
    // docs: sound.play(), sound.stop(), sound.create() — dot notation
    play: () => void;
    stop: () => void;
    /** Creates a new standalone Sound instance. Valid on Sound instances only. */

    // ── Lifecycle ────────────────────────────────────────────────
    // docs: sound.clone(), clone.destroy() — dot notation
    clone: () => WrappedInstance<Instance>;
    destroy: () => void;

    // ── CollectionService tags ───────────────────────────────────
    // docs: sound.get_tags(), sound.add_tag(), sound.remove_tag() — dot notation
    get_tags: () => string[];
    add_tag: (tag: string) => void;
    remove_tag: (tag: string) => void;

    // ── Attributes ───────────────────────────────────────────────
    // docs: sound.set_attribute(), sound.get_attribute() — dot notation
    set_attribute: (name: string, value: unknown) => void;
    get_attribute: (name: string) => unknown;

    // ── Model (valid on Model instances only) ────────────────────
    // docs: model.pivot_to(), model.get_pivot() — dot notation
    pivot_to: (cframe: CFrame) => void;
    get_pivot: () => CFrame;

    // ── Physics (valid on BasePart / physics-enabled instances) ──
    // docs: instance.apply_impulse(), instance.apply_impulse_at_position(), etc. — dot notation
    apply_impulse: (impulse: Vector3) => void;
    apply_impulse_at_position: (impulse: Vector3, position: Vector3) => void;
    apply_angular_impulse_at_position: (angular: Vector3, position: Vector3) => void;
    set_network_owner: (owner: string | undefined) => void;

    // ── Hierarchy / util ─────────────────────────────────────────
    // docs: dot notation throughout instance examples
    is_in_workspace: () => boolean;
    find_first_child: (childName: string, recursive?: boolean) => WrappedInstance | undefined;
    is_a: <C extends keyof Instances>(childName: C) => this is WrappedInstance<Instances[C]>;
    is_descendant_of: (instance: WrappedInstance) => boolean;

} & Pick<StripRobloxBrands<InstanceProperties<T>>, Exclude<keyof StripRobloxBrands<InstanceProperties<T>>, 'Parent'>>
// remove default instance .Parent merging with main

/**
 * Result of tags.get_tagged / tags.get_all_tagged.
 *
 * BasePart instances carry full spatial data. Non-part instances
 * (sounds, scripts, etc.) only provide `name`.
 */
interface TaggedInstanceResult extends WrappedInstance {
    name: string;
    /** Defined for BasePart-derived instances only. */
    cframe?: CFrame;
    /** Defined for BasePart-derived instances only. */
    position?: Vector3;
    /** Euler orientation in degrees. Defined for BasePart-derived instances only. */
    orientation?: Vector3;
    /** Bounding box size. Defined for BasePart-derived instances only. */
    size?: Vector3;
}

/** Returns the root Model of the currently active map. Useful for parenting instances. */
declare function get_map_root(): WrappedInstance;

/** Returns the Characters folder. Useful for parenting character-attached visuals. */
declare function get_chars_root(): WrappedInstance;


// ================================================================
// RAYCASTING  [SHARED]
// ================================================================

interface RaycastParams {
    // docs: raycast_params.filter_descendants_instances(), raycast_params.filter_type() — dot notation
    /** Adds instances and all their descendants to the filter list. */
    filter_descendants_instances: (instances: WrappedInstance[]) => void;
    /** Sets the filter behaviour (Enum.RaycastFilterType.Exclude or Include). */
    filter_type: (filterType: EnumItem) => void;
}

interface RaycastResult {
    /** The WrappedInstance that was struck. */
    instance: WrappedInstance;
    position: Vector3;
    normal: Vector3;
    distance: number;
    material: unknown;
}


// ================================================================
// SHARED GAME DATA TYPES
// ================================================================

type WeaponSlot = "primary" | "secondary" | "throwable1" | "throwable2";
type GunSlot = "primary" | "secondary";
type UtilitySlot = "throwable1" | "throwable2";
type PlayerTeam  = "defender" | "attacker";
type KillerType  = "burning" | "drowning" | "firearm" | "grenade" | "map_reset" | "other" | "reset";

interface KillerData {
    type: KillerType;
    /** Present when the kill was attributed to another player. */
    attacker?: string;
}

/**
 * Returned by weapons.get_setup_from_code.
 * A `status` of `"_"` means the setup is valid and safe to use.
 */
interface WeaponSetupResult {
    /** `"_"` = valid. Any other value is a descriptive error string. */
    status: string;
    data: {
        /** Raw JSON attachment setup string. Pass directly into player.set_weapon. */
        data: string;
    };
}

interface SetupStatusRailFailure {
    [key: string]: unknown;
}

interface SetupStatusResult {
    /** Per-slot state map of non-rail failures. */
    state: Record<string, unknown>;
    rail_state: {
        failures: SetupStatusRailFailure[];
    };
}

interface LoadoutWeaponData {
    weapon: string;
    /** Raw JSON setup string. */
    data: string;
}

interface CharacterWeaponClientData {
    name: string;
    /** Raw JSON setup string. */
    setup: string;
    laser_enabled: boolean;
}

interface ThrowableWeaponData {
    name: string;
    type: "throwable"
}
interface CharacterWeaponData {
    /** Raw ammo table — modifying this directly produces unpredictable results. */
    ammo: unknown;
    client_data: CharacterWeaponClientData;
}

interface MapConfig {
    [key: string]: unknown;
}

interface SettingsLayoutEntry {
    setting: string;
    type: string;
}


// ================================================================
// SHARED GLOBALS  [SHARED]
// ================================================================

/**
 * Timescale-aware wrappers around RenderStepped / Heartbeat.
 * All delta_time values passed to callbacks are pre-multiplied by the
 * current game speed returned by time.get_speed().
 */
declare namespace time {
    /**
     * Registers a per-frame callback (RenderStepped equivalent).
     * @param label  Unique identifier for this listener.
     * @returns A RBXScriptConnection — call Disconnect() to unsubscribe.
     */
    function renderstep(label: string, callback: (deltaTime: number) => void): RBXScriptConnection;
    /**
     * Registers a per-physics-step callback (Heartbeat equivalent).
     * @param label  Unique identifier for this listener.
     * @returns A RBXScriptConnection — call Disconnect() to unsubscribe.
     */
    function heartbeat(label: string, callback: (deltaTime: number) => void): RBXScriptConnection;
    /** Fires when the local timescale changes (e.g. end-of-match slow motion). */
    const local_timescale_changed: RBXScriptSignal;
    /** Overrides the client-local timescale multiplier. */
    function set_local_timescale(scale: number): void;
    /** Returns the current combined game speed multiplier. */
    function get_speed(): number;
    /** task.delay equivalent whose timer is affected by game speed. */
    function delay(seconds: number, callback: () => void): void;
    /** task.wait equivalent whose duration is affected by game speed. */
    function wait(seconds: number): void;
}

/** CollectionService tag queries scoped to workspace instances. */
declare namespace tags {
    /** Returns every CollectionService tag in use anywhere in the game. */
    function get_tags(): string[];
    /** Returns all tagged instances inside workspace (the active map). */
    function get_tagged(tag: string): TaggedInstanceResult[];
    /**
     * Returns all tagged instances regardless of parent hierarchy.
     * Useful when working with maps loaded as models before swapping them in.
     */
    function get_all_tagged(tag: string): TaggedInstanceResult[];
}

/** Spatial queries. */
declare namespace query {
    /** Creates a new empty RaycastParams configuration object. */
    function create_raycast_params(): SnakeRaycastParams;
    /**
     * Casts a ray from `origin` in `direction`.
     * @returns The first hit result, or undefined if nothing was struck.
     */
    function raycast(
        origin: Vector3,
        direction: Vector3,
        params?: SnakeRaycastParams
    ): SnakeRaycastResult | undefined;
}

/**
 * Game-wide settings table. Over 100 configurable keys exist — iterate
 * `sharedvars_descriptions` at runtime to see all of them.
 *
 * Note: the underlying value is a Lua metatable; direct iteration
 * (for…in) does not work. Use `sharedvars_descriptions` to enumerate keys.
 * Writes only take effect when executed on the server.
 */
// Credit goes to speedyfox67 in the Deadline community
declare const sharedvars: {
    /** Whether staying in the air will kill you. */
    ac_airtime_kill: boolean;
    /** Whether movement anticheat is enabled. */
    ac_movement: boolean;
    /** Timeout before invalidating a shot. */
    ac_shot_timeout: number;
    /** @internal */
    ac_sound_kill: boolean;
    /** Whether analytics are enabled. */
    api_analytics_enabled: boolean;
    /** Game-wide announcement. */
    api_announcement: string;
    /** Whether the server will handle messages from deadlinegame.com. */
    api_messaging_enabled: boolean;
    /** Newest server version. */
    api_newest_server_version: string;
    /** Game update message shown to returning players. */
    api_update_message: string;
    /** How close a bot has to be to its target to consider it reached. */
    bot_target_reach_distance: number;
    /** Whether chat announces server changes. */
    chat_announce_changes: boolean;
    /** Whether chat is disabled. */
    chat_disable: boolean;
    /** Maximum chat history. */
    chat_max_history: number;
    /** How often chat tips are shown. */
    chat_tip_frequency: number;
    /** Toggles chat tips for all players. [SERVER] */
    chat_tips_enabled: boolean;
    /** Whether the server is shutting down. */
    crit_shutdown: boolean;
    /** Whether backblast debug is active. */
    dbg_backblast: boolean;
    /** Whether bot pathfinding lines are enabled. */
    dbg_bot_pathfind_lines: boolean;
    /** Whether Canim animator debug is enabled. */
    dbg_canim: boolean;
    /** Whether additional error info exists. */
    dbg_catch_errors: boolean;
    /** Whether character controller gizmos are enabled. */
    dbg_char_gizmos: boolean;
    /** Whether thread yielding checks are enabled. */
    dbg_check_for_thread_yielding: boolean;
    /** Whether to show node offset debug UI in builder. */
    dbg_debug_node_offsets: boolean;
    /** Whether lighting will update according to lighting preset and time. */
    dbg_disable_weather: boolean;
    /** Debugger in the editor. */
    dbg_editor_debugger: boolean;
    /** Whether stats previews are disabled in the editor. */
    dbg_editor_disable_stat_previews: boolean;
    /** Enables the recommended attachment system in the editor. */
    dbg_enable_editor_recommended: boolean;
    /** Whether RemoteEvent profiling is enabled. */
    dbg_event_profiling: boolean;
    /** Hold to interact time for magchecking and firemode checking. */
    dbg_game_hold_to_interact_time: number;
    /** Whether fps is limited to dbg_max_fps. */
    dbg_limit_fps: boolean;
    /** Logservice screen output. */
    dbg_logservice: boolean;
    /** Enables customizing the ammo positions in the editor. */
    dbg_mag_stack: boolean;
    /** Max fps limit while dbg_limit_fps is enabled. */
    dbg_max_fps: number;
    /** Debugger for aimmarker positioning error. */
    dbg_optics: boolean;
    /** Whether to regen weapon offsets at runtime. */
    dbg_position_runtime_regen: boolean;
    /** Delay after dying before death screen. */
    dbg_post_death_delay: number;
    /** Whether rigging mode is enabled. */
    dbg_prepare_for_rig: boolean;
    /** Whether microprofiler tags are enabled. */
    dbg_profiling: boolean;
    /** Projectile gizmos. */
    dbg_projectile: boolean;
    /** Enables customizing any weapon recoil patterns in the F10 menu. */
    dbg_recoil: boolean;
    /** Whether shell extraction location is shown. */
    dbg_show_shell_location: boolean;
    /** Whether to show raycast shot trajectory. */
    dbg_show_shot_trajectory: boolean;
    /** Spawn transition time. */
    dbg_spawn_transition_time: number;
    /** Whether to log rodux store changes. */
    dbg_store_changes: boolean;
    /** Whether the gunshot emitter test mode is enabled. Only works while joining. */
    dbg_test_gunshot_emitter: boolean;
    /** Whether vaulting debug is enabled. */
    dbg_vault_lines: boolean;
    /** Whether warpzone debug is enabled. */
    dbg_warpzones: boolean;
    /** Whether compatibility check limits are enabled. */
    editor_compatibility_checks: boolean;
    /** Editor hover distance. */
    editor_hover_distance: number;
    /** Whether you can mount any attachment in any attachment slot. Allows for very scuffed gun builds. */
    editor_mount_anything: boolean;
    /** Whether attachment streaming on-demand is enabled. */
    ff_attachment_streaming: boolean;
    /** Enables voicelines when reloading, and throwing throwables */
    ff_field_voicelines: boolean;
    /** [READ-ONLY] Game branch. */
    readonly game_branch: string;
    /** [READ-ONLY] Game version. */
    readonly game_version: string;
    /** Whether loadout editing is disabled. */
    gm_disable_loadout_editing: boolean;
    /** How long a TDM match lasts in minutes. */
    gm_match_time_minutes: number;
    /** Whether objective markers are enabled. */
    gm_objective_markers: boolean;
    /** How many points to award per second in other gamemodes. */
    gm_points_per_second: number;
    /** Whether players are forced to spawn in push. */
    gm_push_force_spawning: boolean;
    /** How long to wait before spawning players in push. */
    gm_push_spawn_timer: number;
    /** Whether spawning is enabled in push. */
    gm_push_spawning: boolean;
    /** How long to wait before capturing a point in push. */
    gm_push_time_to_capture: number;
    /** How long to wait before refilling ammo with the refill interactable. */
    gm_refill_interactable_cooldown_time: number;
    /** Server replication frequency in hertz. */
    gm_replication_frequency_hz: number;
    /** Server replication packet size for outgoing player data. */
    gm_replication_packet_size_bytes_outgoing: number;
    /** The amount of players a team can be unbalanced by before team switching isn't allowed. */
    gm_team_balancing_threshold: number;
    /** Whether team scrambling is enabled when a match starts. */
    gm_team_scrambling: boolean;
    /** How long to wait before capturing a point in other gamemodes. */
    gm_time_to_capture: number;
    /** [READ-ONLY] Whether the server is a VIP server. */
    readonly is_vip_server: boolean;
    /** [READ-ONLY] Place configuration. Decides whether the server runs as the lobby or main game. */
    readonly place_config: string;
    /** Whether aiming in bushes is enabled. */
    plr_aim_in_bushes: boolean;
    /** Whether the magcheck UI is always shown. */
    plr_always_show_magcheck: boolean;
    /** Player arm stamina drain. */
    plr_arm_stamina_drain: number;
    /** Player arm stamina drain while holding breath. */
    plr_arm_stamina_drain_hold_breath: number;
    /** Player arm stamina regen speed. */
    plr_arm_stamina_regen: number;
    /** Player arm stamina regen speed while crouching. */
    plr_arm_stamina_regen_crouch: number;
    /** Whether auto jump is enabled. */
    plr_auto_jump: boolean;
    /** Player barrel deviation. */
    plr_barrel_deviation: number;
    /** Player base weight. */
    plr_base_weight: number;
    /** Player buck barrel deviation. */
    plr_buck_barrel_deviation: number;
    /** Debounce before you can cancel a reload again. */
    plr_cancel_reload_timeout: number;
    /** Whether ceasefire is enabled. */
    plr_ceasefire: boolean;
    /** Player damage multiplier. */
    plr_damage_multiplier: number;
    /** Whether shot location is shown in death view. */
    plr_death_view_shot_location: boolean;
    /** Default camera mode. Values include Default, Freecam, TPerson. */
    plr_default_camera_mode: string;
    /** Default NVG DOF focus distance. */
    plr_default_nvg_dof_distance: number;
    /** Whether explosive projectile arming is disabled, meaning they will explode upon contact immediately. */
    plr_disable_arming: boolean;
    /** Whether NVG is disabled. */
    plr_disable_nvg: boolean;
    /** Whether RPG ammo refills are disabled. */
    plr_disable_rpg_refill: boolean;
    /** How long it takes to drown. */
    plr_drown_time: number;
    /** Drum magazines available when spawning for drums. */
    plr_drum_magazines: number;
    /** Whether one hand aiming is enabled. When enabled, the default keybind is I. */
    plr_enable_gangsta_control: boolean;
    /** Whether leaderboard markers are enabled. */
    plr_enable_leaderboard_points: boolean;
    /** Whether markers are enabled. */
    plr_enable_markers: boolean;
    /** Whether mounting is enabled. */
    plr_enable_mounting: boolean;
    /** Player ergonomics multiplier. */
    plr_ergonomics_multiplier: number;
    /** Player explosion blast pressure. */
    plr_explosion_blast_pressure: number;
    /** Player explosion damage multiplier. */
    plr_explosion_damage_multiplier: number;
    /** Whether fall damage is enabled. */
    plr_fall_damage: boolean;
    /** Camera FOV while in freecam. */
    plr_freecam_fov: number;
    /** Player grenade throw strength. */
    plr_grenade_throw_strength: number;
    /** Player headshot damage multiplier. */
    plr_headshot_damage_multiplier: number;
    /** Player health regen speed. */
    plr_health_regen_sec: number;
    /** Player hip height. */
    plr_hipheight: number;
    /** Player initial health. */
    plr_initial_health: number;
    /** How much time the player has after spawning to reset to the lobby instantly. */
    plr_instant_lobby_return_time: number;
    /** Whether you can switch directions while in the air. */
    plr_jump_control_momentum: boolean;
    /** Player jump frequency in hz. */
    plr_jump_frequency: number;
    /** Player jump multiplier. */
    plr_jump_multiplier: number;
    /** Player jump recovery time in seconds. */
    plr_jump_recovery: number;
    /** Player laser max directional distance. */
    plr_laser_max_directional_distance: number;
    /** Whether lens flare is enabled. */
    plr_lens_flare: boolean;
    /** How long to wait before hiding magazine stats. */
    plr_mag_stats_timeout: number;
    /** Magazines available when spawning for non-drum weapons. */
    plr_magazines: number;
    /** Player max arm stamina. */
    plr_max_arm_stamina: number;
    /** Player max directional distance. */
    plr_max_directional_distance: number;
    /** Player max object interaction distance. */
    plr_max_interaction_distance: number;
    /** Player max stamina. */
    plr_max_stamina: number;
    /** Player model. Values include main, orchids_pbr_set, orchids_shark_set. */
    plr_model: string;
    /** Whether momentum is enabled. */
    plr_momentum: boolean;
    /** Player movement smoothing. */
    plr_movement_damping: number;
    /** Player movement stiffness at maximum weight. */
    plr_movement_max_stiffness: number;
    /** Player movement stiffness at minimum weight. */
    plr_movement_min_stiffness: number;
    /** Color player NVG. */
    plr_nv_color: Color3;
    /** Projectile penetration multiplier. */
    plr_penetration_multiplier: number;
    /** Maximum allowed player ping. */
    plr_ping_limit_sec: number;
    /** How long the ping has to be over plr_ping_limit_sec for the client to get kicked. */
    plr_ping_timeout_sec: number;
    /** Ping warning threshold in milliseconds. */
    plr_ping_warning_threshold_ms: number;
    /** Whether PVP is enabled. */
    plr_pvp: boolean;
    /** Player ragdoll throw strength. */
    plr_ragdoll_strength: number;
    /** Global recoil multiplier. */
    plr_recoil: number;
    /** Player replication frequency in hz. */
    plr_replication_frequency_hz: number;
    /** Player replication rollback time in milliseconds. */
    plr_replication_rollback_time_ms: number;
    /** Delay before the player dies after resetting. */
    plr_reset_delay: number;
    /** Player shove bayonet distance. */
    plr_shove_bayonet_distance: number;
    /** Player shove bayonet headshot damage. */
    plr_shove_bayonet_headshot_damage: number;
    /** Player shove bayonet limb damage. */
    plr_shove_bayonet_limb_damage: number;
    /** Player shove bayonet torso damage. */
    plr_shove_bayonet_torso_damage: number;
    /** Player shove distance. */
    plr_shove_distance: number;
    /** Player shove headshot damage. */
    plr_shove_headshot_damage: number;
    /** Player shove limb damage. */
    plr_shove_limb_damage: number;
    /** Player shove melee headshot damage. */
    plr_shove_melee_headshot_damage: number;
    /** Player shove melee limb damage. */
    plr_shove_melee_limb_damage: number;
    /** Player shove melee torso damage. */
    plr_shove_melee_torso_damage: number;
    /** Player shove torso damage. */
    plr_shove_torso_damage: number;
    /** Whether the magcheck UI shows exact ammo. */
    plr_show_exact_magcheck_ammo: boolean;
    /** Spare rounds for single-shot weapons. */
    plr_single_shot_spare_rounds: number;
    /** Spare rounds for internal-magazine weapons. */
    plr_spare_rounds: number;
    /** Player speed multiplier. */
    plr_speed: number;
    /** Player stamina regen speed while crouching. */
    plr_stamina_crouch_regen: number;
    /** Player stamina jump drain. */
    plr_stamina_jump_drain: number;
    /** Player stamina lean drain. */
    plr_stamina_lean_drain: number;
    /** Player stamina regen speed. */
    plr_stamina_regen: number;
    /** Player stamina run drain. */
    plr_stamina_run_drain: number;
    /** Player stamina shake multiplier. */
    plr_stamina_shake_multiplier: number;
    /** Whether suppression is enabled. */
    plr_suppression: boolean;
    /** Player swift switch speed multiplier. */
    plr_swift_switch_speed_multiplier: number;
    /** Whether team killing is enabled. */
    plr_team_kill: boolean;
    /** Player vault barrier detection raycast multiplier. Set dbg_vault_lines to true before playing with these values! */
    plr_vault_barrier_detection_raycast_multiplier: number;
    /** Player vault barrier distance addition. Set dbg_vault_lines to true before playing with these values! */
    plr_vault_barrier_distance_addition: number;
    /** Player vault barrier height reduction. Set dbg_vault_lines to true before playing with these values! */
    plr_vault_barrier_height_reduction: number;
    /** Player vault barrier initial delay multiplier. Set dbg_vault_lines to true before playing with these values! */
    plr_vault_barrier_initial_delay_multiplier: number;
    /** Player vault barrier move time multiplier. Set dbg_vault_lines to true before playing with these values! */
    plr_vault_barrier_move_time_multiplier: number;
    /** Player vault barrier throw multiplier. Set dbg_vault_lines to true before playing with these values! */
    plr_vault_barrier_throw_multiplier: number;
    /** Player vault frontal detection length. Set dbg_vault_lines to true before playing with these values! */
    plr_vault_frontal_detection_length: number;
    /** Player vault frontal size x. Set dbg_vault_lines to true before playing with these values! */
    plr_vault_frontal_size_x: number;
    /** Player vault frontal size y. Set dbg_vault_lines to true before playing with these values! */
    plr_vault_frontal_size_y: number;
    /** Player vault height. */
    plr_vault_height: number;
    /** Player vault inward offset. Set dbg_vault_lines to true before playing with these values! */
    plr_vault_inward_offset: number;
    /** Player vault max delay before starting animation. */
    plr_vault_max_delay: number;
    /** Player vault max vault animation time. */
    plr_vault_max_vault_time: number;
    /** Player vault minimum delay before starting animation. */
    plr_vault_min_delay: number;
    /** Player vault minimum vault animation time. */
    plr_vault_min_vault_time: number;
    /** Player vault rotation limit. Set dbg_vault_lines to true before playing with these values! */
    plr_vault_rotation_limit: number;
    /** Player stamina drain while vaulting. */
    plr_vault_stamina_drain: number;
    /** Player vault top check max hits. Set dbg_vault_lines to true before playing with these values! */
    plr_vault_top_check_max_hits: number;
    /** Player vault top check raycast count. Set dbg_vault_lines to true before playing with these values! */
    plr_vault_top_check_raycast_count: number;
    /** Player vault top detection length. */
    plr_vault_top_detection_length: number;
    /** Player viewmodel state transition speed multiplier. */
    plr_viewmodel_state_transition_speed: number;
    /** When false, weapon stat clamping is disabled for all players. */
    plr_weapon_clamp_stats_values: boolean;
    /** Whether progression related buying features and limits are enabled. */
    ro_earnings_enabled: boolean;
    /** Whether Staging branch players get money. */
    ro_infinite_money_in_staging: boolean;
    /** Server join message. Set with chat.set_join_message(message). */
    ro_join_message: string;
    /** Whether players without chat roles are kicked from the game. */
    ro_kick_non_roled_players: boolean;
    /** Whether money functions are enabled. */
    ro_luau_give_money_enabled: boolean;
    /** Whether the Luau mod console environment was loaded. */
    ro_server_console_loaded: boolean;
    /** Reason why spawning is disabled. Set with (set-spawning-disabled-reason reason). */
    ro_spawning_disabled_reason: string;
    /** Whether bots spawn on their own. */
    sv_bot_auto_spawning_enabled: boolean;
    /** Server creation time. */
    sv_creation_time: number;
    /** Server day cycle speed in seconds. A value of 1 is 1:1 to real life. */
    sv_day_cycle_speed: number;
    /** Server gravity. Mapped to workspace.Gravity. */
    sv_gravity: number;
    /** Whether moderator tag in chat is disabled. */
    sv_hide_mod_tag: boolean;
    /** When the match intermission ends, or undefined if there is none. */
    sv_intermission_finish: number | undefined;
    /** Whether the gun editor is only enabled during intermission. */
    sv_intermission_only_editor: boolean;
    /** Whether only preload list attachments are loaded. */
    sv_load_only_preloaded_attachments: boolean;
    /** Geographical server location. */
    sv_location: string;
    /** How long the intermission between matches lasts. */
    sv_map_intermission_time: number;
    /** How long map voting lasts. */
    sv_map_vote_time: number;
    /** Whether map voting is enabled. */
    sv_map_voting: boolean;
    /** Whether modfiles are enabled. */
    sv_modfiles_enabled: boolean;
    /** Whether tracers have random colors. */
    sv_rainbow_tracers: boolean;
    /** Whether the server uses the map's defined preset when switching maps. */
    sv_respect_preset_properties: boolean;
    /** Whether set dressing events are enabled. Events include background audio or passing aircraft. */
    sv_set_dressing_events_enabled: boolean;
    /** How often set dressing events are triggered. */
    sv_set_dressing_events_frequency_hz: number;
    /** Server sound speed in studs. */
    sv_sound_speed: number;
    /** When false, players are blocked from spawning. [SERVER] */
    sv_spawning_enabled: boolean;
    /** Adds an offset in hours to the in-game clock. */
    sv_time_offset: number;
    /** Server timescale. 1 means realtime. Setting this to 0 will break the game. */
    sv_timescale: number;
    /** Tracer bullet size. */
    sv_tracer_size: number;
    /** Whether Volumika is enabled. */
    sv_volumika: boolean;
    /** [READ-ONLY] VIP server owner. */
    readonly vip_owner: string;
    [key: string]: unknown;
};

/** Human-readable description strings for every sharedvars key. */
declare const sharedvars_descriptions: Record<string, string>;

/**
 * Persistent cross-script key-value storage for the current session.
 * Values survive script reloads but are not persisted across server restarts.
 */
declare const Shared: Record<string, unknown>;

declare function print(...args: unknown[]): void;
/** Clears all output in the in-game developer console. */
declare function clear_console(): void;


// ================================================================
// SERVER GLOBALS  [SERVER]
// ================================================================

/**
 * Sets the base URL prepended to all subsequent require() calls.
 * @example set_require_domain("https://raw.githubusercontent.com/user/repo/master/")
 */
declare function set_require_domain(url: string): void;

/**
 * Fetches and executes a Lua script at `path` relative to the require domain.
 * @example require("luau/server/gamemode_setup.lua")
 */
declare function require(path: string): unknown;

/** Active map management. [SERVER] */
declare namespace map {
    /** Swaps the active map immediately, killing all players. */
    function set_map(name: string): void;
    /** Applies a lighting preset without changing the map. See config.lighting_presets. */
    function set_preset(name: string): void;
    /**
     * Presents a player vote drawn from config.maps.MAP_CONFIGURATION.
     * Resolves with the winning map key once the vote concludes.
     */
    function run_vote(): string;
    /** Applies a full MapConfig entry (map geometry, gamemode, and time simultaneously). */
    function set_map_from_config(mapConfig: MapConfig): void;
    /**
     * Sets the in-game time of day. Value range 0–24; sv_time_offset is applied on top.
     * @param hour e.g. 10 = 10 AM
     */
    function set_time(hour: number): void;
    /** Returns a record of all registered map names and their configuration objects. */
    function get_maps(): Record<string, MapConfig>;
}

/** Gamemode management. [SERVER] */
declare namespace gamemode {
    function set_gamemode(name: string): void;
    /** Switches gamemode without triggering a map reload. */
    function force_set_gamemode(name: string): void;
    /** Enumeration of all registered gamemode names. */
    const available_gamemodes: Record<string, unknown>;
    /**
     * Fires when the current round ends.
     * @param avoidResettingMap When true the map is not reloaded at round end.
     */
    const finished: RBXScriptSignal<(avoidResettingMap: boolean) => void>;
    /** Fires when a new round begins. */
    const started: RBXScriptSignal;
}

/** Chat messages and HUD notifications. [SERVER] */
declare namespace chat {
    /**
     * Fires when any player sends a chat message.
     * Split `content` on spaces to parse slash-commands.
     */
    const player_chatted: RBXScriptSignal<(sender: string, channel: string, content: string) => void>;
    /**
     * Broadcasts a coloured announcement to the chat box for all players.
     * @param color Optional Color3; defaults to white.
     */
    function send_announcement(message: string, color?: Color3): void;
    /** Sets the greeting message shown to players on join. */
    function set_join_message(message: string): void;
    /**
     * Sets the text displayed in the spawn-disabled prompt.
     * Only shown when sharedvars.sv_spawning_enabled is false.
     */
    function set_spawning_disabled_reason(reason: string): void;
    /** Displays a brief HUD notification to all players. */
    function send_ingame_notification(message: string): void;
}

/** Server-side audio utilities. [SERVER] */
declare namespace sound {
    /** Plays a server-wide guitar riff. A critical gameplay feature. */
    function play_sick_riff(): void;
    function create(): WrappedInstance<Sound>;
}

/** Player collection queries. [SERVER] */
declare namespace players {
    /** Returns every connected player (including bots). */
    function get_all(): Player[];
    /** Returns only players who are currently alive in the world. */
    function get_alive(): Player[];
    /** Looks up a player by display name. Returns undefined if not found. */
    function get(name: string): Player | undefined;
    /** Looks up a player by Roblox UserId. Returns undefined if not found. */
    function get_by_userid(id: number): Player | undefined;
    /** Removes all ragdoll models currently present in the world. */
    function reset_ragdolls(): void;
}

/**
 * Per-player API. Instances are obtained through players.get / players.get_all
 * and the on_player_* event callbacks.
 *
 * All members use dot notation in the Deadline modding API
 * (e.g. `player.kill()`, `player.get_team()`), so every callable
 * is declared as a property function so roblox-ts emits `self.method()`
 * rather than `self:method()`.
 */
interface Player {
    /** Display name / Roblox username. */
    readonly name: string;
    /** Roblox UserId — persistent across sessions. */
    readonly id: number;
    /** Server-session-unique numeric ID — changes each time the server restarts. */
    readonly player_id: number;

    // ── Lifecycle ───────────────────────────────────────────────
    // docs: player.is_alive(), player.kill(), player.explode(), etc. — dot notation
    is_alive: () => boolean;
    kill: () => void;
    explode: () => void;
    kick: () => void;
    ban_from_server: () => void;
    /** Spawns the player if they are not already in the world. */
    spawn: () => void;
    /** Force-respawns the player even if they are currently alive. */
    respawn: () => void;

    // ── Team ────────────────────────────────────────────────────
    // docs: player.set_team(), player.get_team() — dot notation
    set_team: (team: PlayerTeam) => void;
    get_team: () => PlayerTeam;

    // ── Classification ──────────────────────────────────────────
    // docs: player.is_bot() — dot notation
    is_bot: () => boolean;

    // ── Position & Camera ───────────────────────────────────────
    // docs: player.set_position(), player.get_position(), player.set_camera_mode() — dot notation
    set_position: (position: Vector3) => void;
    /** Returns null when the player is dead and has no character. */
    get_position: () => Vector3 | undefined;
    set_camera_mode: (mode: string) => void;
    /**
     * Activates a registered custom camera controller for this player.
     * @see register_camera_mode
     */
    set_custom_camera_mode: (mode: string) => void;

    // ── Movement & Stats ────────────────────────────────────────
    // docs: player.set_animation_speed(), player.set_speed(), etc. — dot notation
    set_animation_speed: (speed: number) => void;
    get_animation_speed: () => number;
    set_speed: (speed: number) => void;
    set_jump_multiplier: (multiplier: number) => void;
    set_health: (health: number) => void;
    get_health: () => number;
    deal_damage: (amount: number) => void;
    /** Sets the health value applied on the next spawn — not immediate. */
    set_initial_health: (health: number) => void;

    // ── Appearance ──────────────────────────────────────────────
    // docs: player.set_model() — dot notation
    set_model: (model: string) => void;

    // ── Weapons ─────────────────────────────────────────────────
    // docs: player.refill_ammo(), player.get_active_slot(), etc. — dot notation
    refill_ammo: () => void;
    get_active_slot: () => WeaponSlot;
    /**
     * Forces the player to equip the weapon in the given slot.
     * @param immediate When true the switch happens instantly with no animation.
     */
    equip_weapon: (slot: WeaponSlot, immediate?: boolean) => void;
    /**
     * Assigns a weapon and its attachment setup to a slot.
     * Pass `"nothing"` as the weapon name to clear the slot.
     * Pass `"[]"` as data when you have no attachment setup.
     */
    set_weapon: (slot: WeaponSlot, weapon: string, data?: string) => void;
    /**
     * Returns weapon data from the player's saved loadout.
     * @param loadoutIndex Zero-based index (0 = first loadout, 1 = second, …).
     */
    get_weapon_from_loadout: (loadoutIndex: number, slot: WeaponSlot) => LoadoutWeaponData | undefined;
    /** Returns live weapon data from the character currently present in the world. */
    // get_weapon_data_from_character: (slot: WeaponSlot) => CharacterWeaponData | undefined;
    // get_weapon_data_from_character: (slot: UtilitySlot) => ThrowableWeaponData | undefined;
    get_weapon_data_from_character: <T extends WeaponSlot>(slot: T) => (T extends GunSlot ? CharacterWeaponData : ThrowableWeaponData) | undefined;
    // ── Profile & Leaderboard ───────────────────────────────────
    // docs: player.get_profile_stats(), player.get_leaderboard_stats() — dot notation
    get_profile_stats: () => unknown;
    get_leaderboard_stats: () => unknown;

    // ── Networking ──────────────────────────────────────────────
    // docs: players.get("me").fire_client(123) — dot notation
    /** Sends a remote event payload to this specific player's client. */
    fire_client: (...args: unknown[]) => void;
}

/** Weapon attachment setup code utilities. [SERVER] */
declare namespace weapons {
    /**
     * Decodes a share-code string into setup data ready for player.set_weapon.
     * Always check `result.status === "_"` before using the returned data.
     */
    function get_setup_from_code(code: string): WeaponSetupResult;
    /**
     * Validates decoded setup data against the current weapon registry.
     * Returns a plain error string for certain failure classes, or a structured
     * SetupStatusResult when attachment / rail slot failures are present.
     */
    function get_setup_status(data: unknown): string | SetupStatusResult;
}

/** World-object spawning utilities. [SERVER] */
declare namespace spawning {
    /** Creates an M67-equivalent explosion at the given world-space position. */
    function explosion(position: Vector3): void;
    /**
     * Spawns a bot player. Bots are treated as regular players in all APIs.
     * @returns The bot's assigned display name.
     */
    function bot(): string;
    /** i'd start watching out if i were you */
    function monster(): string;
}

/**
 * Central game configuration tables.
 * Most entries are available on both server and client; client-only
 * additions (gunshots, game_sounds, keybinds, settings_layout) are
 * read/write only from client scripts.
 */
declare namespace config {
    /**
     * Map configuration table.
     * `MAP_CONFIGURATION` is the named table consumed by map.run_vote.
     * `STUDIO_CONFIGURATION` is a factory for local Studio testing.
     */
    const maps: Record<string, MapConfig> & {
        MAP_CONFIGURATION: Record<string, MapConfig>;
        STUDIO_CONFIGURATION: () => MapConfig;
    };
    /** Lighting presets usable with map.set_preset(name). */
    const lighting_presets: Record<string, unknown>;
    /** Sound presets usable as a map's sound_preset property. */
    const sound_presets: Record<string, unknown>;
    /** Names of every weapon registered in the game. */
    const weapon_names: string[];

    // ── Client-only ─────────────────────────────────────────────
    /**
     * Map of weapon name → gunshot sound asset ID string.
     * Assign a new asset ID to override a weapon's gunshot sound. [CLIENT]
     */
    const gunshots: Record<string, string>;
    /**
     * Nested map of game sound groups and their asset IDs.
     * Entries can be replaced to override built-in game sounds. [CLIENT]
     */
    const game_sounds: Record<string, Record<string, unknown>>;
    /** Map of action name → keybind configuration for all registered actions. [CLIENT] */
    const keybinds: Record<string, unknown>;
    /**
     * Settings panel layout descriptor. Push SettingsLayoutEntry objects into
     * `controls` to add custom entries to the controls settings page. [CLIENT]
     */
    const settings_layout: {
        controls: SettingsLayoutEntry[];
    };
}

interface GameDataNamespace {
    readonly lighting: { value: unknown };
    readonly map_properties: { value: { lighting_preset: string } };
    readonly map_config: { value: Record<string, unknown> };
    [key: string]: { value: unknown };
}

/**
 * Live game state: active map, gamemode, lighting preset, and more.
 * Iterate over the object to discover all available keys at runtime. [SERVER]
 */
declare const game_data: GameDataNamespace;

/**
 * Loads an encoded modfile data string into the game at runtime.
 * Fires on_modfile_loaded upon completion. [SERVER]
 */
declare function load_modfile(data: string): void;

/** Fires whenever any modfile (including other mods) finishes loading. [SERVER] */
declare const on_modfile_loaded: RBXScriptSignal;

// ── Networking ────────────────────────────────────────────────────

/** Fires on the server when any client calls fire_server(). [SERVER] */
declare const on_client_event: RBXScriptSignal<(player: string, args: unknown[]) => void>;

/** Sends a remote event payload from this client to the server. [CLIENT] */
declare function fire_server(...args: unknown[]): void;

/** Fires on the client when the server calls player.fire_client(). [CLIENT] */
declare const on_server_event: RBXScriptSignal<(args: unknown[]) => void>;

// ── Player lifecycle events ───────────────────────────────────────

/** Fires when any player's character enters the world. [SERVER] */
declare const on_player_spawned: RBXScriptSignal<(name: string) => void>;

/** Fires when any player connects to the server. [SERVER] */
declare const on_player_joined: RBXScriptSignal<(name: string) => void>;

/** Fires when any player disconnects from the server. [SERVER] */
declare const on_player_left: RBXScriptSignal<(name: string) => void>;

/**
 * Fires when any player dies.
 * `statsCounted` indicates whether this death was recorded in the
 * player's persistent profile stats. [SERVER]
 */
declare const on_player_died: RBXScriptSignal<(
    name: string,
    position: Vector3,
    killerData: KillerData,
    statsCounted: boolean
) => void>;

// ── Interactables ─────────────────────────────────────────────────

/**
 * Implement this interface to define the behaviour of a custom interactable.
 * The `interact` method is called whenever a player uses the interactable.
 */
interface InteractableHandler {
    interact(player: Player): void;
}

/**
 * Constructor-style class whose `new` factory produces an InteractableHandler.
 * Pass your class directly to register_interactable.
 */
interface InteractableHandlerClass {
    new(instance: WrappedInstance): InteractableHandler;
}

/**
 * Registers a custom interactable handler class for a given type string.
 *
 * Built-in types: `"ammo_refill"`, `"capture_refill"`, `"door"`.
 *
 * Custom types require a Model in the map with:
 *   - An Attachment instance named `display_point`
 *   - An attribute `interactable_type` whose string value matches `type`
 *
 * The map must be reloaded before newly registered interactables take effect. [SERVER]
 */
declare function register_interactable(type: string, handler: InteractableHandlerClass): void;


// ================================================================
// CLIENT GLOBALS  [CLIENT]
// ================================================================

/** The local player's display name. [CLIENT] */
declare const local_player: string;

/** Local character state and spawn/death lifecycle events. [CLIENT] */
declare namespace framework {
    namespace character {
        function is_alive(): boolean;
        function get_position(): Vector3;
        /** Returns the current camera CFrame, including ADS and lean offsets. */
        function get_camera_cframe(): CFrame;
        /** Programmatically enables or disables night-vision rendering. */
        function set_nv_enabled(enabled: boolean): void;
        /** True when night-vision is active for any reason, including NV scopes. */
        function is_nv_enabled(): boolean;
        /** True only when NV head-gear (goggles etc.) specifically is enabled. */
        function is_nv_head_gear_enabled(): boolean;
    }
    /** Fires when the local player's character spawns into the world. */
    const on_spawned: RBXScriptSignal;
    /** Fires when the local player's character dies. */
    const on_died: RBXScriptSignal;
}

/** Low-level mouse and keyboard input abstraction layer. [CLIENT] */
declare namespace input {
    /** Equivalent to UserInputService:GetMouseDelta(). */
    function get_mouse_delta(): Vector2;
    /** Returns the player's configured mouse sensitivity scalar. */
    function get_mouse_sensitivity(): number;
    /** Returns Mouse.Origin as a CFrame. */
    function get_mouse_origin(): CFrame;
    /** Equivalent to UserInputService:GetMouseLocation(). */
    function get_mouse_position(): Vector2;
    /** Suppresses a default game action by its registered name (e.g. "crouch"). */
    function disable_default_action(action: string): void;
    /** Re-enables a previously disabled default game action. */
    function enable_default_action(action: string): void;
}

/**
 * The two input phase constants used with bind_user_setting and bind_key.
 * Use InputType.Began for key-down and InputType.Ended for key-up.
 */
declare const InputType: {
    readonly Began: "Began";
    readonly Ended: "Ended";
};

type InputTypeValue = "Began" | "Ended";

interface InputGroupDefault {
    // docs: group:disconnect_all_binds() — colon, keep as method
    disconnect_all_binds(): void;
}
interface InputGroupInstance extends InputGroupDefault {
    // docs: input_group:bind_key(...) — colon, keep as method
    bind_key(
        callback: () => void,
        type: InputTypeValue,
        ignoreGameProcessed: boolean,
        keyCode: EnumItem
    ): void;
}
interface ClientInputGroupInstance extends InputGroupDefault {
    // docs: client_input_group:bind_user_setting(...) — colon, keep as method
    bind_user_setting(callback: () => void, type: InputTypeValue, action: string): void;
}

/**
 * Creates an input group with fixed KeyCode bindings.
 * Prefer ClientInputGroup when bindings should respect the player's settings. [CLIENT]
 */
declare const InputGroup: {
    new(): InputGroupInstance;
};

/**
 * Creates an input group whose action bindings respect the player's
 * configured keybinds from config.keybinds. [CLIENT]
 */
declare const ClientInputGroup: {
    new(): ClientInputGroupInstance;
};

// ── Custom Camera Mode ────────────────────────────────────────────

/**
 * Framework-injected state populated before each call to update().
 * Read `input` to get movement intent; write to `camera_cframe` to
 * communicate the desired camera position back to the framework.
 */
type CameraControllerMovementInputType = {
    movementX: number,
    movementY: number,
    movementZ: number
}
interface CameraControllerFrameState {
    input: CameraControllerMovementInputType
    camera_cframe: CFrame
    cam_position?: CFrame
    rot_x?: number
    rot_y?: number
    min_roll?: number
    max_roll?: number
}

/**
 * Implement this interface to create a fully custom camera controller.
 * @example
 * class MyFreecam implements CameraController {
 *   input!: CameraControllerFrameState["input"];
 *   camera_cframe!: CFrame;
 *   constructor(public getHeadCFrame: () => CFrame) {
 *     this.camera_cframe = new CFrame();
 *   }
 *   update(dt: number) {
 *     // move camera based on this.input, write result to this.camera_cframe
 *   }
 * }
 * register_camera_mode("MyFreecam", MyFreecam);
 * players.get("me")?.set_custom_camera_mode("CustomFreecam");
 */
interface CameraController extends CameraControllerFrameState {
    update(deltaTime: number): void;
}

interface CameraControllerClass {
    new(getHeadCFrame: () => CFrame): CameraController;
}

/**
 * Registers a constructor class as a named camera mode.
 * Activate it per-player with player.set_custom_camera_mode(name).
 * Pass `"Default"` as the name to fully replace the built-in camera. [CLIENT]
 */
declare function register_camera_mode(name: string, controller: CameraControllerClass): void;

// ── Iris Immediate-Mode UI ────────────────────────────────────────

/**
 * Handle returned by any Iris widget-creating call.
 * Poll the event methods inside your iris.Connect callback to react to input.
 *
 * All members use dot notation in the docs:
 * `if (iris.Button({"Click me"}).clicked()) { ... }`
 * so every callable is a property function.
 */
interface IrisWidget {
    // docs: widget.clicked(), widget.hovered(), etc. — dot notation
    /** True on the frame the widget was clicked. */
    clicked: () => boolean;
    /** True while the pointer is over the widget. */
    hovered: () => boolean;
    /** True while the widget is being held / interacted with. */
    active: () => boolean;
    /** True for toggle-style widgets (Checkbox etc.) when currently checked. */
    checked: () => boolean;
    /** True on the frame the widget's value changed. */
    changed: () => boolean;
    [key: string]: unknown;
}

/**
 * Iris immediate-mode UI library.
 * Full docs: https://sirmallard.github.io/Iris/
 *
 * The callback registered with iris.Connect() runs every frame (colon — inherited
 * from RBXScriptSignal). All widget-creating calls use dot notation in the docs
 * (e.g. `iris.Window(...)`, `iris.Button(...)`), so those are property functions.
 *
 * Every opened container (Window, Tree, CollapsingHeader) requires a
 * matching iris.End() call. [CLIENT]
 *
 * @example
 * iris.Connect(() => {
 *   iris.Window(["My Mod"]);
 *     iris.Text(["Hello world"]);
 *     if (iris.Button(["Do thing"]).clicked()) { doThing(); }
 *   iris.End();
 * });
 */
type IrisID = string;
type IrisState<T> = {
    ID: IrisID,
    value: T,
    get(): T,
    set(newValue: T): T,
    onChange(callback: (newValue: T) => () => void): void,
    ConnectedWidgets: Record<IrisID, IrisWidget>,
    ConnectedFunctions: ((newValue: T) => () => void)[]
}
type IrisWindowWidgetState = {
    size?: IrisState<Vector2>,
    position?: IrisState<Vector2>,
    isUncollapsed?: IrisState<boolean>,
    isOpened?: IrisState<boolean>,
    scrollDistance?: IrisState<number>
}
interface IrisInstance {
    // docs: iris.Window(), iris.Text(), iris.Button(), iris.End() etc. — dot notation

    // ── Containers ───────────────────────────────────────────────
    Window: (args: [title: string, ...rest: unknown[]], state: IrisWindowWidgetState) => IrisWidget;
    Tree: (args?: [label: string, ...rest: unknown[]]) => IrisWidget;
    CollapsingHeader: (args?: [label: string, ...rest: unknown[]]) => IrisWidget;
    /** Closes the most recently opened container. */
    End: () => void;

    // ── Display ──────────────────────────────────────────────────
    Text: (args: [text: string, ...rest: unknown[]]) => IrisWidget;
    Separator: () => void;
    SameLine: () => void;

    // ── Inputs ───────────────────────────────────────────────────
    Button: (args: [label: string, ...rest: unknown[]]) => IrisWidget;
    Checkbox: (args?: unknown[]) => IrisWidget;
    InputText: (args: [label: string, ...rest: unknown[]]) => IrisWidget;
    InputNum: (args?: unknown[]) => IrisWidget;
    InputVector2: (args?: unknown[]) => IrisWidget;
    InputVector3: (args?: unknown[]) => IrisWidget;
    InputColor3: (args?: unknown[]) => IrisWidget;
    InputColor4: (args?: unknown[]) => IrisWidget;
    SliderNum: (args?: unknown[]) => IrisWidget;
    DragNum: (args?: unknown[]) => IrisWidget;
    State: <T>(value: T) => IrisState<T>;
    /** Call to disconnect it */
    Connect(callback: () => void): () => void
    /** Catch-all for any Iris widget not listed above. */
    [key: string]: unknown;
}

declare const iris: IrisInstance;



// my stuff
declare function is_studio(): boolean
declare function is_private_server(): boolean
declare function clear_console(): void
// Note: info
declare function fire_server(...args: RobloxSerializableInstance[]): void
// Note: output_trace
declare function create_instance<T extends keyof CreatableInstances>(className: T): WrappedInstance<CreatableInstances[T]>
declare function info(...args: any[]): void
declare function skip_tutorial(): void