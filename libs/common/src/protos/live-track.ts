// @generated by protobuf-ts 2.8.2 with parameter long_type_number,force_optimize_code_size
// @generated from protobuf file "live-track.proto" (syntax proto3)
// tslint:disable
import { MessageType } from '@protobuf-ts/runtime';
/**
 * An event on a Track.
 *
 * @generated from protobuf message LiveExtra
 */
export interface LiveExtra {
  /**
   * @generated from protobuf field: optional string message = 1;
   */
  message?: string;
  /**
   * @generated from protobuf field: optional uint32 speed = 2;
   */
  speed?: number;
  /**
   * @generated from protobuf field: optional int32 gnd_alt = 3;
   */
  gndAlt?: number;
}
/**
 * All the points for a tracker.
 * This message is stored in the DB.
 *
 * @generated from protobuf message LiveTrack
 */
export interface LiveTrack {
  /**
   * Only available client side, not stored in the DB.
   *
   * @generated from protobuf field: optional int64 id = 1;
   */
  id?: number;
  /**
   * Only available client side, not stored in the DB.
   *
   * @generated from protobuf field: optional string name = 2;
   */
  name?: string;
  /**
   * @generated from protobuf field: repeated float lat = 3;
   */
  lat: number[];
  /**
   * @generated from protobuf field: repeated float lon = 4;
   */
  lon: number[];
  /**
   * @generated from protobuf field: repeated int32 alt = 5;
   */
  alt: number[];
  /**
   * @generated from protobuf field: repeated int32 time_sec = 6;
   */
  timeSec: number[];
  /**
   * @generated from protobuf field: repeated uint32 flags = 7;
   */
  flags: number[];
  /**
   * map from an index to extra info.
   *
   * @generated from protobuf field: map<uint32, LiveExtra> extra = 8;
   */
  extra: {
    [key: number]: LiveExtra;
  };
}
/**
 * All the points for a tracker.
 * Differential encoded to transmit over the wire.
 * See `differentialDecodeLiveTrack(...)` for decoding the values.
 *
 * @generated from protobuf message LiveDifferentialTrack
 */
export interface LiveDifferentialTrack {
  /**
   * @generated from protobuf field: int64 id = 1;
   */
  id: number;
  /**
   * @generated from protobuf field: string name = 2;
   */
  name: string;
  /**
   * @generated from protobuf field: repeated sint32 lat = 3;
   */
  lat: number[];
  /**
   * @generated from protobuf field: repeated sint32 lon = 4;
   */
  lon: number[];
  /**
   * @generated from protobuf field: repeated sint32 alt = 5;
   */
  alt: number[];
  /**
   * @generated from protobuf field: repeated uint32 time_sec = 6;
   */
  timeSec: number[];
  /**
   * @generated from protobuf field: repeated uint32 flags = 7;
   */
  flags: number[];
  /**
   * map from an index to extra info.
   *
   * @generated from protobuf field: map<uint32, LiveExtra> extra = 8;
   */
  extra: {
    [key: number]: LiveExtra;
  };
}
/**
 * All active trackers.
 *
 * @generated from protobuf message LiveDifferentialTrackGroup
 */
export interface LiveDifferentialTrackGroup {
  /**
   * @generated from protobuf field: repeated LiveDifferentialTrack tracks = 1;
   */
  tracks: LiveDifferentialTrack[];
  /**
   * Whether this is a incremental update (vs full update).
   *
   * @generated from protobuf field: bool incremental = 2;
   */
  incremental: boolean;
  /**
   * Remote IDs populated for export.
   *
   * @generated from protobuf field: repeated string remoteId = 3;
   */
  remoteId: string[];
}
// @generated message type with reflection information, may provide speed optimized methods
class LiveExtra$Type extends MessageType<LiveExtra> {
  constructor() {
    super('LiveExtra', [
      { no: 1, name: 'message', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
      { no: 2, name: 'speed', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
      { no: 3, name: 'gnd_alt', kind: 'scalar', opt: true, T: 5 /*ScalarType.INT32*/ },
    ]);
  }
}
/**
 * @generated MessageType for protobuf message LiveExtra
 */
export const LiveExtra = new LiveExtra$Type();
// @generated message type with reflection information, may provide speed optimized methods
class LiveTrack$Type extends MessageType<LiveTrack> {
  constructor() {
    super('LiveTrack', [
      { no: 1, name: 'id', kind: 'scalar', opt: true, T: 3 /*ScalarType.INT64*/, L: 2 /*LongType.NUMBER*/ },
      { no: 2, name: 'name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
      { no: 3, name: 'lat', kind: 'scalar', repeat: 1 /*RepeatType.PACKED*/, T: 2 /*ScalarType.FLOAT*/ },
      { no: 4, name: 'lon', kind: 'scalar', repeat: 1 /*RepeatType.PACKED*/, T: 2 /*ScalarType.FLOAT*/ },
      { no: 5, name: 'alt', kind: 'scalar', repeat: 1 /*RepeatType.PACKED*/, T: 5 /*ScalarType.INT32*/ },
      { no: 6, name: 'time_sec', kind: 'scalar', repeat: 1 /*RepeatType.PACKED*/, T: 5 /*ScalarType.INT32*/ },
      { no: 7, name: 'flags', kind: 'scalar', repeat: 1 /*RepeatType.PACKED*/, T: 13 /*ScalarType.UINT32*/ },
      { no: 8, name: 'extra', kind: 'map', K: 13 /*ScalarType.UINT32*/, V: { kind: 'message', T: () => LiveExtra } },
    ]);
  }
}
/**
 * @generated MessageType for protobuf message LiveTrack
 */
export const LiveTrack = new LiveTrack$Type();
// @generated message type with reflection information, may provide speed optimized methods
class LiveDifferentialTrack$Type extends MessageType<LiveDifferentialTrack> {
  constructor() {
    super('LiveDifferentialTrack', [
      { no: 1, name: 'id', kind: 'scalar', T: 3 /*ScalarType.INT64*/, L: 2 /*LongType.NUMBER*/ },
      { no: 2, name: 'name', kind: 'scalar', T: 9 /*ScalarType.STRING*/ },
      { no: 3, name: 'lat', kind: 'scalar', repeat: 1 /*RepeatType.PACKED*/, T: 17 /*ScalarType.SINT32*/ },
      { no: 4, name: 'lon', kind: 'scalar', repeat: 1 /*RepeatType.PACKED*/, T: 17 /*ScalarType.SINT32*/ },
      { no: 5, name: 'alt', kind: 'scalar', repeat: 1 /*RepeatType.PACKED*/, T: 17 /*ScalarType.SINT32*/ },
      { no: 6, name: 'time_sec', kind: 'scalar', repeat: 1 /*RepeatType.PACKED*/, T: 13 /*ScalarType.UINT32*/ },
      { no: 7, name: 'flags', kind: 'scalar', repeat: 1 /*RepeatType.PACKED*/, T: 13 /*ScalarType.UINT32*/ },
      { no: 8, name: 'extra', kind: 'map', K: 13 /*ScalarType.UINT32*/, V: { kind: 'message', T: () => LiveExtra } },
    ]);
  }
}
/**
 * @generated MessageType for protobuf message LiveDifferentialTrack
 */
export const LiveDifferentialTrack = new LiveDifferentialTrack$Type();
// @generated message type with reflection information, may provide speed optimized methods
class LiveDifferentialTrackGroup$Type extends MessageType<LiveDifferentialTrackGroup> {
  constructor() {
    super('LiveDifferentialTrackGroup', [
      { no: 1, name: 'tracks', kind: 'message', repeat: 1 /*RepeatType.PACKED*/, T: () => LiveDifferentialTrack },
      { no: 2, name: 'incremental', kind: 'scalar', T: 8 /*ScalarType.BOOL*/ },
      { no: 3, name: 'remoteId', kind: 'scalar', repeat: 2 /*RepeatType.UNPACKED*/, T: 9 /*ScalarType.STRING*/ },
    ]);
  }
}
/**
 * @generated MessageType for protobuf message LiveDifferentialTrackGroup
 */
export const LiveDifferentialTrackGroup = new LiveDifferentialTrackGroup$Type();