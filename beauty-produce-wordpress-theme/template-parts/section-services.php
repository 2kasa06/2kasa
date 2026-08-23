<?php
/**
 * サービス一覧セクション。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$bp_args = wp_parse_args(
	isset( $args ) ? $args : array(),
	array(
		'ids'      => array(),
		'label'    => 'SERVICE',
		'title'    => '8つのメニュー',
		'subtitle' => '単体でのご利用も、組み合わせも可能です。どれを選べばよいか迷う場合は、カウンセリングでご一緒に決めます。',
		'columns'  => 4,
		'anchor'   => 'services',
		'tone'     => 'ivory',
	)
);

$bp_query_args = array(
	'post_type'      => 'bp_service',
	'posts_per_page' => -1,
	'orderby'        => array( 'menu_order' => 'ASC', 'date' => 'ASC' ),
);

if ( ! empty( $bp_args['ids'] ) ) {
	$bp_query_args['post__in'] = array_map( 'absint', $bp_args['ids'] );
	$bp_query_args['orderby']  = 'post__in';
}

$bp_services = get_posts( $bp_query_args );

if ( ! $bp_services ) {
	return;
}
?>
<section id="<?php echo esc_attr( $bp_args['anchor'] ); ?>" class="bp-section bp-section--<?php echo esc_attr( $bp_args['tone'] ); ?>">
	<div class="bp-container">
		<div class="bp-heading bp-heading--center reveal">
			<p class="section-label"><?php echo esc_html( $bp_args['label'] ); ?></p>
			<h2 class="section-title"><?php echo esc_html( $bp_args['title'] ); ?></h2>
			<p class="section-subtitle"><?php echo esc_html( $bp_args['subtitle'] ); ?></p>
		</div>

		<div class="bp-grid bp-grid--<?php echo (int) $bp_args['columns']; ?> bp-mt-lg">
			<?php foreach ( $bp_services as $bp_index => $bp_service ) : ?>
				<?php
				$bp_number   = get_post_meta( $bp_service->ID, 'bp_number', true );
				$bp_duration = get_post_meta( $bp_service->ID, 'bp_duration', true );
				$bp_price    = get_post_meta( $bp_service->ID, 'bp_price', true );
				?>
				<article class="card-glow bp-card reveal" style="transition-delay:<?php echo (int) ( ( $bp_index % 4 ) * 80 ); ?>ms;">
					<?php if ( $bp_number ) : ?>
						<span class="bp-card__number"><?php echo esc_html( $bp_number ); ?></span>
					<?php endif; ?>
					<h3 class="bp-card__title"><?php echo esc_html( get_the_title( $bp_service ) ); ?></h3>
					<div class="bp-card__text"><?php echo esc_html( wp_strip_all_tags( $bp_service->post_content ) ); ?></div>

					<?php if ( $bp_duration || $bp_price ) : ?>
						<dl class="bp-card__meta">
							<?php if ( $bp_duration ) : ?>
								<div><dt>TIME</dt><dd><?php echo esc_html( $bp_duration ); ?></dd></div>
							<?php endif; ?>
							<?php if ( $bp_price ) : ?>
								<div><dt>PRICE</dt><dd><?php echo esc_html( $bp_price ); ?></dd></div>
							<?php endif; ?>
						</dl>
					<?php endif; ?>
				</article>
			<?php endforeach; ?>
		</div>

		<p class="bp-note">※ 表示価格は税込です。組み合わせ割引についてはお問い合わせください。</p>
	</div>
</section>
